/**
 * Lightweight, dependency-free renderer for the small subset of markdown the
 * assistant tends to produce in chat replies: **bold**, numbered lists
 * ("1. ..."), bullet lists ("- " / "* "), and paragraph breaks. Shared by
 * both Catch Up's and Planner's chat rails.
 */
function renderInlineBold(text, keyPrefix) {
  const parts = text.split(/(\*\*.+?\*\*)/g).filter((p) => p !== "");
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${keyPrefix}-b${i}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${keyPrefix}-t${i}`}>{part}</span>;
  });
}

export function formatChatText(text) {
  if (!text) return null;

  const lines = text.split("\n");
  const blocks = [];
  let currentList = null;

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  lines.forEach((line, idx) => {
    const numberedMatch = line.match(/^\s*(\d+)\.\s+(.*)/);
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)/);

    if (numberedMatch) {
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(numberedMatch[2]);
    } else if (bulletMatch) {
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
    } else {
      flushList();
      blocks.push({ type: "line", text: line, key: idx });
    }
  });
  flushList();

  return blocks.map((block, i) => {
    if (block.type === "ol" || block.type === "ul") {
      const Tag = block.type === "ol" ? "ol" : "ul";
      return (
        <Tag key={`list-${i}`} style={{ margin: "4px 0", paddingLeft: 20 }}>
          {block.items.map((item, j) => (
            <li key={j} style={{ marginBottom: 2 }}>
              {renderInlineBold(item, `${i}-${j}`)}
            </li>
          ))}
        </Tag>
      );
    }
    if (block.text === "") {
      return <div key={`br-${i}`} style={{ height: 6 }} />;
    }
    return <div key={`line-${i}`}>{renderInlineBold(block.text, `line-${i}`)}</div>;
  });
}
