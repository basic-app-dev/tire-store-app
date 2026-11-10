export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950?: string;
}

export interface AutomotiveTokens {
  colors: {
    asphalt: ColorScale;
    alloy: ColorScale;
    raceRed: ColorScale;
    pitAmber: ColorScale;
    nitroBlue: ColorScale;
    certifiedGreen: ColorScale;
  };
  fontFamily: {
    display: string[];
    mono: string[];
  };
  boxShadow: {
    tire: string;
    bay: string;
  };
  borderRadius: {
    tire: string;
  };
}

export declare const automotiveTokens: AutomotiveTokens;
export declare const tailwindPreset: Record<string, unknown>;
