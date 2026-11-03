import { createContext, useCallback, useContext, useEffect, useRef, type ComponentProps, type ComponentRef, type PropsWithChildren } from 'react';
import { Keyboard, Platform, ScrollView, type TextInput } from 'react-native';

export type InputHandle = ComponentRef<typeof TextInput>;
const FocusContext = createContext<(input: InputHandle | null) => void>(() => {});
export const useRevealField = () => useContext(FocusContext);

// Compartilhado por telas e modais. Não depende de bibliotecas de teclado.
export function KeyboardScroll({ children, ...props }: PropsWithChildren<ComponentProps<typeof ScrollView>>) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const focused = useRef<InputHandle | null>(null);
  const offset = useRef(0);
  const keyboardTop = useRef(Number.POSITIVE_INFINITY);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reveal = useCallback(() => {
    const input = focused.current;
    if (!input) return;
    if (Platform.OS === 'web') {
      (input as unknown as { scrollIntoView?: (options: { block: string; behavior: string }) => void }).scrollIntoView?.({ block: 'nearest', behavior: 'auto' });
      return;
    }
    input.measureInWindow((_x, inputY, _width, inputHeight) => {
      scroll.current?.getNativeScrollRef()?.measureInWindow((_sx: number, scrollY: number, _sw: number, scrollHeight: number) => {
        const bottom = Math.min(scrollY + scrollHeight, keyboardTop.current) - 28;
        const delta = inputY < scrollY + 12 ? inputY - scrollY - 12 : Math.max(0, inputY + inputHeight - bottom);
        if (delta) scroll.current?.scrollTo({ y: Math.max(0, offset.current + delta), animated: true });
      });
    });
  }, []);
  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(reveal, 100);
  }, [reveal]);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => { keyboardTop.current = event.endCoordinates.screenY; schedule(); });
    const hide = Keyboard.addListener('keyboardDidHide', () => { keyboardTop.current = Number.POSITIVE_INFINITY; });
    return () => { show.remove(); hide.remove(); if (timer.current) clearTimeout(timer.current); };
  }, [schedule]);
  const focus = useCallback((input: InputHandle | null) => { focused.current = input; schedule(); }, [schedule]);
  return <FocusContext.Provider value={focus}>
    <ScrollView {...props} ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={false}
      scrollEventThrottle={16} onScroll={(event) => { offset.current = event.nativeEvent.contentOffset.y; props.onScroll?.(event); }}
      onLayout={(event) => { if (focused.current) schedule(); props.onLayout?.(event); }}>
      {children}
    </ScrollView>
  </FocusContext.Provider>;
}
