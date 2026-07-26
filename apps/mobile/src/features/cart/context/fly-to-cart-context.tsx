import React, { createContext, useContext, useState, useCallback } from 'react';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface FlyToCartItem {
  id: string;
  imageUrl: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  targetX?: number;
  targetY?: number;
}

interface FlyToCartContextType {
  activeAnimation: FlyToCartItem | null;
  startFlyAnimation: (item: Omit<FlyToCartItem, 'id'>) => void;
  onAnimationComplete: () => void;
  cartIconCoords: { x: number; y: number };
  setCartIconCoords: (coords: { x: number; y: number }) => void;
  triggerCartPulse: () => void;
  pulseTrigger: number;
}

const FlyToCartContext = createContext<FlyToCartContextType | undefined>(undefined);

// Default position for cart header icon (top right area of header bar)
const DEFAULT_CART_COORDS = {
  x: SCREEN_WIDTH - 45,
  y: 55,
};

export const FlyToCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeAnimation, setActiveAnimation] = useState<FlyToCartItem | null>(null);
  const [cartIconCoords, setCartIconCoords] = useState(DEFAULT_CART_COORDS);
  const [pulseTrigger, setPulseTrigger] = useState(0);

  const triggerCartPulse = useCallback(() => {
    setPulseTrigger((prev) => prev + 1);
  }, []);

  const startFlyAnimation = useCallback((item: Omit<FlyToCartItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    setActiveAnimation({
      id,
      ...item,
      targetX: item.targetX ?? cartIconCoords.x,
      targetY: item.targetY ?? cartIconCoords.y,
    });
  }, [cartIconCoords]);

  const onAnimationComplete = useCallback(() => {
    setActiveAnimation(null);
    triggerCartPulse();
  }, [triggerCartPulse]);

  return (
    <FlyToCartContext.Provider
      value={{
        activeAnimation,
        startFlyAnimation,
        onAnimationComplete,
        cartIconCoords,
        setCartIconCoords,
        triggerCartPulse,
        pulseTrigger,
      }}
    >
      {children}
    </FlyToCartContext.Provider>
  );
};

export function useFlyToCart() {
  const context = useContext(FlyToCartContext);
  if (!context) {
    throw new Error('useFlyToCart must be used within a FlyToCartProvider');
  }
  return context;
}
