import type { ComponentProps } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCopy } from "../../i18n/useCopy";

function MarkdownLink({ href, children }: ComponentProps<"a">) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function MarkdownImage({ src, alt }: ComponentProps<"img">) {
  const href = typeof src === "string" ? src : undefined;
  if (!href) return <span>{alt}</span>;
  return <MarkdownLink href={href}>{alt || href}</MarkdownLink>;
}

/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- 可横向滚动的代码区需要键盘焦点。 */
function MarkdownCode({ children }: ComponentProps<"pre">) {
  const { t } = useCopy();
  return (
    <section className="chat-code" tabIndex={0} aria-label={t("chat.codeBlock")}>
      <pre>{children}</pre>
    </section>
  );
}
/* oxlint-enable jsx-a11y/no-noninteractive-tabindex */

const markdownComponents = {
  a: MarkdownLink,
  img: MarkdownImage,
  pre: MarkdownCode,
} satisfies Components;

export default function MessageMarkdown({ text }: { text: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} skipHtml components={markdownComponents}>
      {text}
    </Markdown>
  );
}
