import * as React from 'react';
import type { TireProduct } from '@tire-store/types';
import { Card, CardContent, CardFooter } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { ShieldCheck, Zap } from 'lucide-react';

export interface TireCardProps {
  tire: TireProduct;
  onSelect?: (tire: TireProduct) => void;
  onAddToCart?: (tire: TireProduct) => void;
  isAddingToCart?: boolean;
}

export function TireCard({ tire, onSelect, onAddToCart, isAddingToCart }: TireCardProps) {
  const formattedPrice = (tire.priceCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const sizeString = `${tire.width}/${tire.aspectRatio}R${tire.rimDiameter} ${tire.loadIndex}${tire.speedRating}`;

  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:shadow-md hover:border-amber-500/40 flex flex-col justify-between">
      <CardContent className="p-5">
        {/* Header Tags */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary" className="uppercase font-mono text-[10px]">
            {tire.season.replace('_', ' ')}
          </Badge>
          {tire.runFlat ? (
            <Badge variant="warning" className="flex items-center gap-1 text-[10px]">
              <Zap className="h-3 w-3" /> Run-Flat
            </Badge>
          ) : null}
        </div>

        {/* Brand & Model */}
        <div className="mb-2">
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            {tire.brand}
          </p>
          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 transition-colors">
            {tire.model}
          </h4>
        </div>

        {/* Tire Dimensions */}
        <div className="rounded-md bg-slate-50 dark:bg-slate-800/60 p-2.5 my-3 border border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500 block">Tire Specification</span>
          <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
            {sizeString}
          </span>
        </div>

        {/* Specs Details */}
        <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
          {tire.warrantyMiles ? (
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>{tire.warrantyMiles.toLocaleString()} mi warranty</span>
            </div>
          ) : null}
          {tire.treadwearRating ? <span>UTQG: {tire.treadwearRating}</span> : null}
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-0 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-2">
        <div>
          <span className="text-xs text-slate-400 block">Price per tire</span>
          <span className="text-lg font-black text-slate-900 dark:text-slate-50">
            {formattedPrice}
          </span>
        </div>

        <div className="flex gap-2">
          {onSelect ? (
            <Button variant="outline" size="sm" onClick={() => onSelect(tire)}>
              Details
            </Button>
          ) : null}
          {onAddToCart ? (
            <Button size="sm" onClick={() => onAddToCart(tire)} isLoading={isAddingToCart}>
              Add to Cart
            </Button>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  );
}
