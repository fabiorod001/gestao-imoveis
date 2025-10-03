# Design System Mobile-First - RentManager

## Princípios
1. **Mobile First**: Todas decisões de design começam no mobile
2. **Touch Targets**: Mínimo 44px (Apple HIG / Material Design)
3. **Performance**: Componentes leves, lazy loading
4. **Acessibilidade**: Contraste WCAG AA, keyboard navigation

## Breakpoints
- xs: 375px (iPhone SE)
- sm: 640px (tablets pequenos)
- md: 768px (tablets)
- lg: 1024px (desktop)
- xl: 1280px (desktop large)

## Espaçamento (base 4px)
- p-1: 4px
- p-2: 8px
- p-4: 16px
- p-6: 24px
- p-8: 32px

## Tipografia Mobile
- Base: 16px (evita zoom iOS)
- Desktop: 14px (md:text-sm)
- Headings: escalam de mobile → desktop

## Componentes Base
- Button: min-height 44px, active:scale-95
- Input: text-base mobile, text-sm desktop
- Card: padding 16px mobile, 24px desktop
- BottomSheet: modal nativo mobile (sobe do bottom)
- SelectMobile: native select em mobile (melhor UX)

## Safe Areas
- iOS notch: safe-top, safe-bottom
- Android: handled automaticamente

## Gestos Mobile
- Touch manipulation habilitado
- Tap highlight removido
- Active states com scale
