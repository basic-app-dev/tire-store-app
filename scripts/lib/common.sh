#!/usr/bin/env bash
# ==============================================================================
# Tire Store Platform — Common Shell Utilities & Environment Discovery
# ==============================================================================

set -Eeuo pipefail

# ANSI color codes
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
  echo -e "${BLUE}ℹ️  ${1}${NC}"
}

log_success() {
  echo -e "${GREEN}✅ ${1}${NC}"
}

log_warn() {
  echo -e "${YELLOW}⚠️  ${1}${NC}"
}

log_error() {
  echo -e "${RED}❌ ${1}${NC}" >&2
}

# Ensure Java 25 LTS is discoverable in PATH and JAVA_HOME
ensure_java_env() {
  if command -v java >/dev/null 2>&1; then
    local java_version_output
    java_version_output=$(java -version 2>&1 | head -n 1)
    if [[ "${java_version_output}" =~ 25 ]]; then
      return 0
    fi
  fi

  # 1. Check mise shims
  if [ -x "${HOME}/.local/share/mise/shims/java" ]; then
    export PATH="${HOME}/.local/share/mise/shims:${PATH}"
    if command -v java >/dev/null 2>&1; then
      return 0
    fi
  fi

  # 2. Check mise CLI discovery
  if command -v mise >/dev/null 2>&1; then
    local mise_java
    mise_java="$(mise which java 2>/dev/null || true)"
    if [ -n "${mise_java}" ] && [ -x "${mise_java}" ]; then
      export PATH="$(dirname "${mise_java}"):${PATH}"
      export JAVA_HOME="$(cd "$(dirname "${mise_java}")/.." && pwd)"
      return 0
    fi
  fi

  # 3. Check standard mise install directory for temurin-25
  for possible_jdk in "${HOME}/.local/share/mise/installs/java/temurin-25"* "${HOME}/.local/share/mise/installs/java/"*; do
    if [ -d "${possible_jdk}" ] && [ -x "${possible_jdk}/bin/java" ]; then
      export JAVA_HOME="${possible_jdk}"
      export PATH="${possible_jdk}/bin:${PATH}"
      return 0
    fi
  done

  # Fallback: if java command exists, allow it to proceed
  if command -v java >/dev/null 2>&1; then
    return 0
  fi

  log_error "Could not find a valid Java installation. Please ensure Java 25 is installed."
  return 1
}

# Runtime directories
get_runtime_dir() {
  local repo_root="$1"
  local dir="${repo_root}/.logs"
  mkdir -p "${dir}"
  echo "${dir}"
}

get_pid_file() {
  local repo_root="$1"
  local name="$2"
  echo "$(get_runtime_dir "${repo_root}")/${name}.pid"
}

get_log_file() {
  local repo_root="$1"
  local name="$2"
  echo "$(get_runtime_dir "${repo_root}")/${name}.log"
}

# Process inspection
is_pid_alive() {
  local pid="$1"
  if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
    return 0
  fi
  return 1
}

is_port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -Pi ":${port}" -sTCP:LISTEN -t >/dev/null 2>&1
    return $?
  elif command -v ss >/dev/null 2>&1; then
    ss -tlpn "sport = :${port}" 2>/dev/null | grep -q "LISTEN"
    return $?
  fi
  return 1
}

get_port_pid() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -Pi ":${port}" -sTCP:LISTEN -t 2>/dev/null | head -n 1
    return 0
  fi
  return 1
}

# Verify process ownership
is_process_owned() {
  local pid="$1"
  local expected_keyword="$2"
  if ! is_pid_alive "${pid}"; then
    return 1
  fi
  local cmdline
  if [ -f "/proc/${pid}/cmdline" ]; then
    cmdline=$(tr '\0' ' ' < "/proc/${pid}/cmdline" 2>/dev/null || true)
  else
    cmdline=$(ps -p "${pid}" -o args= 2>/dev/null || true)
  fi
  if [[ "${cmdline}" =~ ${expected_keyword} ]]; then
    return 0
  fi
  return 1
}

# Stop process gracefully
stop_service_process() {
  local pid_file="$1"
  local service_name="$2"
  local expected_keyword="$3"
  local port="${4:-}"

  if [ ! -f "${pid_file}" ]; then
    if [ -n "${port}" ] && is_port_in_use "${port}"; then
      local occ_pid
      occ_pid=$(get_port_pid "${port}")
      log_warn "Service '${service_name}' has no active PID file, but port ${port} is occupied by PID ${occ_pid} (not owned by this script system). Leaving untouched."
    else
      log_info "Service '${service_name}' is not running (no PID file)."
    fi
    return 0
  fi

  local pid
  pid=$(cat "${pid_file}" 2>/dev/null || true)
  if [ -z "${pid}" ]; then
    rm -f "${pid_file}"
    log_warn "Service '${service_name}' PID file was empty. Cleaned up."
    return 0
  fi

  if ! is_pid_alive "${pid}"; then
    rm -f "${pid_file}"
    log_info "Cleaned up stale PID file for '${service_name}' (PID ${pid} was not running)."
    return 0
  fi

  if ! is_process_owned "${pid}" "${expected_keyword}"; then
    rm -f "${pid_file}"
    log_warn "PID ${pid} does not match expected service '${service_name}' (${expected_keyword}). Avoiding killing unrelated process. Stale PID file removed."
    return 0
  fi

  log_info "Stopping '${service_name}' (PID ${pid})..."

  # Capture child processes (e.g. Gradle daemon or worker JVM)
  local child_pids
  child_pids=$(pgrep -P "${pid}" 2>/dev/null || true)

  # Signal process group and direct PID
  kill -15 -"${pid}" 2>/dev/null || kill -15 "${pid}" 2>/dev/null || true
  for cpid in ${child_pids}; do
    kill -15 "${cpid}" 2>/dev/null || true
  done

  # Bounded wait (up to 15 seconds)
  local waited=0
  while is_pid_alive "${pid}" && [ ${waited} -lt 15 ]; do
    sleep 1
    waited=$((waited + 1))
  done

  if is_pid_alive "${pid}"; then
    log_warn "Process ${pid} did not exit within 15 seconds; sending SIGKILL..."
    kill -9 -"${pid}" 2>/dev/null || kill -9 "${pid}" 2>/dev/null || true
    for cpid in ${child_pids}; do
      kill -9 "${cpid}" 2>/dev/null || true
    done
    sleep 1
  fi

  # Check if port is still occupied by a child
  if [ -n "${port}" ] && is_port_in_use "${port}"; then
    local remaining_port_pid
    remaining_port_pid=$(get_port_pid "${port}")
    if [ -n "${remaining_port_pid}" ] && is_process_owned "${remaining_port_pid}" "${expected_keyword}"; then
      log_warn "Terminating remaining service worker on port ${port} (PID ${remaining_port_pid})..."
      kill -9 "${remaining_port_pid}" 2>/dev/null || true
      sleep 1
    fi
  fi

  if ! is_pid_alive "${pid}"; then
    rm -f "${pid_file}"
    log_success "Service '${service_name}' stopped successfully."
    return 0
  else
    log_error "Failed to stop service '${service_name}' (PID ${pid} still running)."
    return 1
  fi
}

# Health check
check_actuator_health() {
  local port="$1"
  local service_name="$2"
  local timeout="${3:-5}"
  local url="http://localhost:${port}/actuator/health"

  if ! is_port_in_use "${port}"; then
    log_error "Service '${service_name}' is not listening on port ${port}."
    return 1
  fi

  local response
  if ! response=$(curl -sSf --connect-timeout 2 --max-time "${timeout}" "${url}" 2>/dev/null); then
    log_error "Service '${service_name}' health check failed: unable to fetch ${url}."
    return 1
  fi

  if echo "${response}" | grep -q '"status":"UP"'; then
    log_success "Service '${service_name}' is HEALTHY (UP) at ${url}"
    return 0
  else
    log_error "Service '${service_name}' is UNHEALTHY at ${url}. Response: ${response}"
    return 1
  fi
}

