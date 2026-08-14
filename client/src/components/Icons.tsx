// Small, dependency-free inline icons (stroke-based, inherit currentColor).
import type { SVGProps } from "react";

function Base(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);
export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Base>
);
export const IconCollection = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Base>
);
export const IconLibrary = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M4 5v14M9 5v14M14 6l4 13M4 5h5M9 5h5" />
  </Base>
);
export const IconSpark = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </Base>
);
export const IconTrash = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7" />
  </Base>
);
export const IconCopy = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </Base>
);
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
);
export const IconLink = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
  </Base>
);
export const IconSun = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
  </Base>
);
export const IconMoon = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M21 12.8A8 8 0 1 1 11.2 3a6 6 0 0 0 9.8 9.8z" />
  </Base>
);
export const IconDownload = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
  </Base>
);
export const IconEdit = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
  </Base>
);
