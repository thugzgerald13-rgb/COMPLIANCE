// Shared Tailwind class strings for the modal / form UI that was previously
// duplicated verbatim across AddClientModal, AddReferenceModal,
// UpdatePayableModal, NotificationHubModal and the Dashboard edit modal.
//
// Field-specific variants (colored text, monospace, resize, etc.) are composed
// by appending modifiers to the base constants at the call site so each field
// keeps its exact original styling.

// Full-screen dimmed backdrop that centers a modal card.
export const MODAL_OVERLAY =
  'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4';

// Lighter-blur backdrop variant used by the simpler add/edit reference modals.
export const MODAL_OVERLAY_SUBTLE =
  'fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4';

// Standard form field label.
export const FIELD_LABEL =
  'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

// Standard text input / textarea (with placeholder styling).
export const FIELD_INPUT =
  'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm';

// Standard select control (no placeholder styling).
export const FIELD_SELECT =
  'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm';

// Compact (text-xs, rounded-xl) input base used in the payable-entry modals.
// Append modifiers such as `font-medium`, `font-mono`, `resize-none`, etc.
export const FIELD_INPUT_COMPACT =
  'w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

// Secondary (cancel) button in the add/edit reference modals.
export const BTN_CANCEL =
  'px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer';

// Primary (submit) button in the add/edit reference modals.
export const BTN_PRIMARY =
  'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm cursor-pointer';
