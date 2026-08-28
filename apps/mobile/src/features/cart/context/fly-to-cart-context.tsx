import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  queue: FlyToCartItem[];
  startFlyAnimation: (item: Omit<FlyToCartItem, 'id'>) => void;
  onAnimationComplete: (id?: string) => void;
  cartIconCoords: { x: number; y: number };
  setCartIconCoords: (coords: { x: number; y: number }) => void;
  triggerCartPulse: () => void;
  pulseTrigger: number;
}

const FlyToCartContext = createContext<FlyToCartContextType | undefined>(undefined);

export const FlyToCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const DEFAULT_CART_COORDS = {
    x: windowWidth - 45,
    y: (insets.top || 30) + 24,
  };
  const [queue, setQueue] = useState<FlyToCartItem[]>([]);
  const activeAnimation = queue[0] ?? null;
  const [cartIconCoords, setCartIconCoords] = useState(DEFAULT_CART_COORDS);
  const [pulseTrigger, setPulseTrigger] = useState(0);
  const idCounterRef = useRef(0);

  const triggerCartPulse = useCallback(() => {
    setPulseTrigger((prev) => prev + 1);
  }, []);

  const startFlyAnimation = useCallback(
    (item: Omit<FlyToCartItem, 'id'>) => {
      const id = `${Date.now()}-${idCounterRef.current++}`;
      const entry: FlyToCartItem = {
        id,
        ...item,
        targetX: item.targetX ?? cartIconCoords.x,
        targetY: item.targetY ?? cartIconCoords.y,
      };
      setQueue((q) => [...q, entry]);
    },
    [cartIconCoords],
  );

  const onAnimationComplete = useCallback(
    (id?: string) => {
      setQueue((q) => {
        if (id) return q.filter((i) => i.id !== id);
        return q.slice(1);
      });
      triggerCartPulse();
    },
    [triggerCartPulse],
  );

  return (
    <FlyToCartContext.Provider
      value={{
        activeAnimation,
        queue,
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
