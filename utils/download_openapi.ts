import { ensureDir } from "@std/fs";
import { basename, join } from "@std/path";

export function convertGitHubBlobToRaw(url: string): string {
  if (url.includes("github.com") && url.includes("/blob/")) {
    return url.replace("github.com", "raw.githubusercontent.com").replace(
      "/blob/",
      "/",
    );
  }
  return url;
}

export function guessFilename(url: string, originalFilename?: string): string {
  if (originalFilename) return originalFilename;
  try {
    const urlPath = new URL(url).pathname;
    const filename = basename(urlPath);
    if (!filename || filename === "/") {
      return "openapi.yaml";
    }
    return filename;
  } catch {
    return "openapi.yaml";
  }
}

export async function downloadFile(
  url: string,
  outputDir: string = ".",
  originalFilename?: string,
) {
  try {
    console.log(`Downloading from ${url}...`);

    const fetchUrl = convertGitHubBlobToRaw(url);
    if (fetchUrl !== url) {
      console.log(`Converted GitHub blob URL to raw URL: ${fetchUrl}`);
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const text = await response.text();
    const filename = guessFilename(fetchUrl, originalFilename);

    await ensureDir(outputDir);
    const outputPath = join(outputDir, filename);

    await Deno.writeTextFile(outputPath, text);
    console.log(`Successfully saved to ${outputPath}`);
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
}

export async function searchGitHub(
  query: string,
): Promise<Array<{ name: string; repo: string; url: string }>> {
  const term = `filename:openapi.yaml ${query}`;
  const searchUrl = `https://api.github.com/search/code?q=${
    encodeURIComponent(term)
  }`;

  console.log(`Searching GitHub for: "${term}"...`);

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
  };

  const token = Deno.env.get("GITHUB_TOKEN");
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  const response = await fetch(searchUrl, { headers });

  if (!response.ok) {
    if (response.status === 403) {
      console.error(
        "GitHub API rate limit exceeded. Please set GITHUB_TOKEN environment variable.",
      );
    } else {
      console.error(`GitHub Search failed: ${response.statusText}`);
    }
    return [];
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    console.log("No results found.");
    return [];
  }

  return data.items.map((item: any) => ({
    name: item.name,
    repo: item.repository.full_name,
    url: item.html_url, // We will convert this to raw later
  }));
}

if (import.meta.main) {
  const input = Deno.args[0];
  const outputFilename = Deno.args[1];

  if (!input) {
    console.error(
      "Usage: deno run -A utils/download_openapi.ts <URL_OR_SEARCH_TERM> [output_filename]",
    );
    Deno.exit(1);
  }

  try {
    let urlToDownload = input;

    // Simple check if it's a URL
    if (!input.startsWith("http://") && !input.startsWith("https://")) {
      // Treat as search query
      const results = await searchGitHub(input);

      if (results.length === 0) {
        Deno.exit(1);
      }

      console.log(`\nFound ${results.length} results:`);
      results.forEach((r, i) => {
        console.log(`[${i + 1}] ${r.repo} - ${r.name}`);
      });

      const choice = prompt("\nEnter number to download (or 'q' to quit):");
      if (!choice || choice.toLowerCase() === "q") {
        console.log("Cancelled.");
        Deno.exit(0);
      }

      const index = parseInt(choice) - 1;
      if (isNaN(index) || index < 0 || index >= results.length) {
        console.error("Invalid selection.");
        Deno.exit(1);
      }

      urlToDownload = results[index].url;
      console.log(`Selected: ${urlToDownload}`);
    }

    await downloadFile(urlToDownload, ".", outputFilename);
  } catch {
    Deno.exit(1);
  }
}
