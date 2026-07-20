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
  FLOATING_TOOLBAR: 3500,

  /** Backdrop invisível para fechar popups com clique fora */
  BACKDROP_POPOVER: 3550,

  /** Menus de contexto de clique direito, painéis de duplo clique e players de áudio */
  CONTEXT_MENU: 3580,

  /** Modal flutuante de ajuda/tutorial no canto */
  TUTORIAL_PILL: 3600,

  /** Overlay backdrop de menus dropdown (ex.: menu Peças) */
  BACKDROP_DROPDOWN: 3650,

  /** Menus dropdown e popovers da barra de ferramentas (menu Peças, paleta de cores) */
  DROPDOWN_MENU: 3700,

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
  FLOATING_TOOLBAR: 'z-[3500]',
  BACKDROP_POPOVER: 'z-[3550]',
  CONTEXT_MENU: 'z-[3580]',
  TUTORIAL_PILL: 'z-[3600]',
  BACKDROP_DROPDOWN: 'z-[3650]',
  DROPDOWN_MENU: 'z-[3700]',
  TOAST_NOTIFICATION: 'z-[1500]',
  SIDEBAR_TOGGLE: 'z-[1999]',
  SIDEBAR_MOBILE: 'z-[2000]',
  MODAL_ADMIN: 'z-[3000]',
  MODAL_DIALOG: 'z-[5000]',
  CRITICAL_ALERT: 'z-[9999]',
  TACTICAL_GLASS: 'backdrop-blur-md bg-slate-950/80 border border-slate-800/60 rounded-xl shadow-2xl',
} as const;
