import { parse } from "csso/syntax";

function getInfo(postcssNode) {
  return {
    postcssNode,
  };
}

function appendChildren(cssoNode, nodes) {
  cssoNode.children.fromArray(nodes.map(postcssToCsso));
  return cssoNode;
}

function parseToCsso(css, config, postcssNode) {
  try {
    const cssoNode = parse(css || "", config);
    cssoNode.loc = getInfo(postcssNode);
    return cssoNode;
  } catch (e) {
    if (e.name === "CssSyntaxError" || e.name === "SyntaxError") {
      throw postcssNode.error(e.message, { index: e.offset });
    }

    throw e;
  }
}

function postcssToCsso(node) {
  switch (node.type) {
    case "root":
      return appendChildren(
        parseToCsso("", { context: "stylesheet" }, node),
        node.nodes
      );

    case "rule":
      return {
        type: "Rule",
        loc: getInfo(node),
        prelude: parseToCsso(node.selector, { context: "selectorList" }, node),
        block: appendChildren(
          parseToCsso("{}", { context: "block" }, node),
          node.nodes
        ),
      };

    case "atrule": {
      const cssoNode = {
        type: "Atrule",
        loc: getInfo(node),
        name: node.name,
        prelude: node.params
          ? parseToCsso(
              node.params,
              { context: "atrulePrelude", atrule: node.name },
              node
            )
          : null,
        block: null,
      };

      if (node.nodes) {
        cssoNode.block = appendChildren(
          parseToCsso("{}", { context: "block" }, node),
          node.nodes
        );
      }

      return cssoNode;
    }

    case "decl":
      return parseToCsso(
        (node.raws.before || "").trimLeft() + node.toString(),
        { context: "declaration" },
        node
      );

    case "comment":
      return {
        type: "Comment",
        loc: getInfo(node),
        value: node.raws.left + node.text + node.raws.right,
      };
  }
}

export default postcssToCsso;
