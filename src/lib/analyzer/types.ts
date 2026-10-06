export interface WebsiteAnalysis {
  url: string;

  metadata: {
    title: string;
    description: string;
    language: string;
  };

  viewport: {
    width: number;
    height: number;
  };

  navigation: {
    text: string;
    href: string;
  }[];

  headings: {
    level: number;
    text: string;
  }[];

  paragraphs: string[];

  buttons: string[];

  images: {
    src: string;
    alt: string;
  }[];

  colors: {
    background: string[];
    text: string[];
    border: string[];
    accent: string[];
  };

  typography: {
    fontFamilies: string[];
    fontSizes: string[];
    fontWeights: string[];
  };

  spacing: {
    padding: string[];
    margin: string[];
    gap: string[];
  };

  sections: {
    tag: string;
    text: string;
    className: string;
  }[];

  responsive: {
    desktop: {
      width: number;
      height: number;
      screenshot: string;
    };

    tablet: {
      width: number;
      height: number;
      screenshot: string;
    };

    mobile: {
      width: number;
      height: number;
      screenshot: string;
    };
  };
}