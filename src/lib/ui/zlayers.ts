/**
 * Constantes numéricas e classes Tailwind de Z-Index padronizadas do SOUZA CAD.
 * Centraliza a hierarquia visual para evitar sobreposições indevidas.
 */

export const Z_INDEX = {
  /** Camada de destaque decorativo / animações leves (ex.: borda de folha destravada) */
  DECORATION: 5,

  /** Fundo do vídeo de introdução */
  INTRO_VIDEO: 100,

  /** Painel flutuante de personalização rápida de objetos (direta no mapa/planta) */
  PANEL_OBJECT_PROPERTIES: 990,

  /** Controles do MapEditor, badges flutuantes de modo e notificações centrais */
  MAP_CONTROLS: 1000,

  /** Painéis laterais de dicas do mapa */
  MAP_HINTS: 1100,

  /** Barras de ferramentas flutuantes (barra principal e barra de áudios no rodapé) */
  FLOATING_TOOLBAR: 1160,

  /** Backdrop invisível para fechar popups com clique fora */
  BACKDROP_POPOVER: 1190,

  /** Menus de contexto de clique direito, painéis de duplo clique e players de áudio */
  CONTEXT_MENU: 1200,

  /** Modal flutuante de ajuda/tutorial no canto */
  TUTORIAL_PILL: 1250,

  /** Overlay backdrop de menus dropdown (ex.: menu Peças) */
  BACKDROP_DROPDOWN: 1290,

  /** Menus dropdown e popovers da barra de ferramentas (menu Peças, paleta de cores) */
  DROPDOWN_MENU: 1300,

  /** Toasts e mensagens de aviso do rodapé */
  TOAST_NOTIFICATION: 1500,

  /** Handles e botões flutuantes de alternância da sidebar lateral */
  SIDEBAR_TOGGLE: 1999,

  /** Sidebar lateral / rodapé de status no mobile */
  SIDEBAR_MOBILE: 2000,

  /** Sub-modais administrativos (ex.: Painel Master SaaS) */
  MODAL_ADMIN: 3000,

  /** Modais de diálogo Radix padrão da aplicação (Dialog Overlay + Content) */
  MODAL_DIALOG: 5000,

  /** Alertas críticos do sistema (bloqueio de segurança, aviso fatal, manutenção) */
  CRITICAL_ALERT: 9999,
} as const;

/** Classes utilitárias Tailwind prontas para uso */
export const Z_CLASSES = {
  DECORATION: 'z-[5]',
  INTRO_VIDEO: 'z-[100]',
  PANEL_OBJECT_PROPERTIES: 'z-[990]',
  MAP_CONTROLS: 'z-[1000]',
  MAP_HINTS: 'z-[1100]',
  FLOATING_TOOLBAR: 'z-[1160]',
  BACKDROP_POPOVER: 'z-[1190]',
  CONTEXT_MENU: 'z-[1200]',
  TUTORIAL_PILL: 'z-[1250]',
  BACKDROP_DROPDOWN: 'z-[1290]',
  DROPDOWN_MENU: 'z-[1300]',
  TOAST_NOTIFICATION: 'z-[1500]',
  SIDEBAR_TOGGLE: 'z-[1999]',
  SIDEBAR_MOBILE: 'z-[2000]',
  MODAL_ADMIN: 'z-[3000]',
  MODAL_DIALOG: 'z-[5000]',
  CRITICAL_ALERT: 'z-[9999]',
  TACTICAL_GLASS: 'backdrop-blur-md bg-slate-950/80 border border-slate-800/60 rounded-xl shadow-2xl',
} as const;
