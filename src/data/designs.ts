export const designs = [
  { id: "atlas", label: "atlas" },
  { id: "bento", label: "bento" },
  { id: "luna", label: "luna" },
  { id: "crt", label: "crt" },
  { id: "ceefax", label: "ceefax" },
  { id: "teletext", label: "teletext" },
  { id: "vhs", label: "vhs" },
  { id: "web1", label: "web1.0" },
  { id: "zine", label: "zine" },
  { id: "guestbook", label: "guestbook" },
] as const;

export type DesignId = (typeof designs)[number]["id"];

export const designIds: DesignId[] = designs.map((design) => design.id);

export const defaultDesign: DesignId = "atlas";
