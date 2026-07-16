import { defineMcp } from "@lovable.dev/mcp-js";
import searchBooksTool from "./tools/search-books";

export default defineMcp({
  name: "smart-ai-library-mcp",
  title: "Smart AI Library MCP",
  version: "0.1.0",
  instructions:
    "Public tools for the Smart AI Library catalog. Use `search_books` to look up books by title, author, or branch and see rack location and availability.",
  tools: [searchBooksTool],
});