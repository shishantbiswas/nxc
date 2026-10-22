type ConvertReturn = {
  window: { document: { documentElement: { outerHTML: string } } };
};

declare module "mhtml2html" {
  export function convert(htmlContent: string): Promise<ConvertReturn>;
}
