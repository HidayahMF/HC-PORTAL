/* Ikon authored: stroke tipis konsisten 1.6, 18px, currentColor. Sekunder terhadap tipografi. */
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const IcGrid = (p) => (
  <svg {...base} {...p}><rect x="3" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" /></svg>
);
export const IcUser = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" /></svg>
);
export const IcOrg = (p) => (
  <svg {...base} {...p}><rect x="9" y="3" width="6" height="5" rx="1.2" /><rect x="3" y="16" width="6" height="5" rx="1.2" /><rect x="15" y="16" width="6" height="5" rx="1.2" /><path d="M12 8v4M6 16v-2h12v2" /></svg>
);
export const IcClock = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IcUsers = (p) => (
  <svg {...base} {...p}><circle cx="9" cy="8.5" r="3" /><path d="M3 19c0-3.2 2.7-5 6-5s6 1.8 6 5" /><path d="M15.5 6.2a3 3 0 0 1 0 5.6M18 19c0-2.2-.6-3.8-1.7-4.9" /></svg>
);
export const IcCalendar = (p) => (
  <svg {...base} {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" /><path d="M8.5 14.5l2 2 4-3.5" /></svg>
);
export const IcFile = (p) => (
  <svg {...base} {...p}><path d="M6 3h7l5 5v13H6z" /><path d="M13 3v5h5" /></svg>
);
export const IcBadge = (p) => (
  <svg {...base} {...p}><rect x="4.5" y="3" width="15" height="18" rx="2" /><circle cx="12" cy="10" r="2.2" /><path d="M8.5 17c0-1.8 1.6-3 3.5-3s3.5 1.2 3.5 3" /></svg>
);
export const IcKey = (p) => (
  <svg {...base} {...p}><circle cx="8" cy="15" r="3.5" /><path d="M10.6 12.6 20 3.5M16.5 7l2 2M14 9.5l2 2" /></svg>
);
export const IcPoll = (p) => (
  <svg {...base} {...p}><path d="M5 20V11M12 20V5M19 20v-6" /></svg>
);
export const IcReport = (p) => (
  <svg {...base} {...p}><path d="M4 19h16" /><path d="M5 15l4-4 3 2 6-7" /><circle cx="20" cy="6" r="1.3" /></svg>
);
export const IcLogout = (p) => (
  <svg {...base} {...p}><path d="M9 4H5v16h4" /><path d="M15 8l4 4-4 4M9 12h10" /></svg>
);
export const IcSearch = (p) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>
);
export const IcBell = (p) => (
  <svg {...base} {...p}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>
);
export const IcChevron = (p) => (
  <svg {...base} {...p}><path d="M9 6l6 6-6 6" /></svg>
);
export const IcMenu = (p) => (
  <svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const IcClose = (p) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IcCap = (p) => (
  <svg {...base} {...p}><path d="M3 9.5 12 5l9 4.5-9 4.5z" /><path d="M7 12v4.2c0 1 2.2 1.8 5 1.8s5-.8 5-1.8V12" /></svg>
);
export const IcUpcoming = (p) => (
  <svg {...base} {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" /></svg>
);
export const IcArrowUp = (p) => (
  <svg {...base} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);
export const IcArrowDown = (p) => (
  <svg {...base} {...p}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
);
