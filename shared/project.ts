import manifest from "../package.json" with { type: "json" };

// 公开元信息的投影；版本、名称和产品文案只在 package.json 维护。
export const project = Object.freeze({
  name: manifest.name,
  version: manifest.version,
  description: manifest.description,
  displayName: manifest.product.displayName,
  tagline: manifest.product.tagline,
  locale: manifest.product.locale,
  storageNamespace: manifest.product.storageNamespace,
  themeColor: manifest.product.themeColor,
  title: `${manifest.product.displayName} · ${manifest.product.tagline}`,
});

export type Project = typeof project;
