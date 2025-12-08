#!/usr/bin/env -S deno run -A

import { ensureDir } from "@std/fs/ensure-dir";
import { join } from "@std/path";

interface GitHubSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubFile[];
}

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  url: string;
  git_url: string;
  html_url: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  download_url: string;
}

class GitHubOpenAPIDownloader {
  private readonly outputDir = "./openapi/gh";
  private readonly githubToken: string | undefined;
  private readonly baseUrl = "https://api.github.com";
  private readonly maxFilesPerPage = 100;
  
  constructor() {
    this.githubToken = Deno.env.get("GITHUB_TOKEN");
    if (!this.githubToken) {
      console.error("❌ GitHub Token Required!");
      console.error("   GitHub's code search API requires authentication.");
      console.error("   Please set GITHUB_TOKEN environment variable with a GitHub personal access token.");
      console.error("   You can create one at: https://github.com/settings/tokens");
      console.error("   The token needs 'public_repo' scope for searching public repositories.");
      Deno.exit(1);
    }
  }

  private async makeGitHubRequest(url: string): Promise<Response> {
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
    };

    if (this.githubToken) {
      headers["Authorization"] = `token ${this.githubToken}`;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 403) {
        const resetTime = response.headers.get("X-RateLimit-Reset");
        const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date();
        throw new Error(`GitHub API rate limit exceeded. Resets at: ${resetDate.toISOString()}`);
      }
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  private async searchOpenAPIFiles(page = 1): Promise<GitHubSearchResult> {
    // GitHub's code search API requires authentication
    if (!this.githubToken) {
      throw new Error("GitHub token is required for searching code. Please set the GITHUB_TOKEN environment variable.");
    }

    const query = `filename:openapi.yaml`;
    const url = `${this.baseUrl}/search/code?q=${encodeURIComponent(query)}&per_page=${this.maxFilesPerPage}&page=${page}`;
    
    console.log(`🔍 Searching GitHub for openapi.yaml files (page ${page})...`);
    
    const response = await this.makeGitHubRequest(url);
    const result = await response.json() as GitHubSearchResult;
    
    console.log(`Found ${result.items.length} files on page ${page} (${result.total_count} total)`);
    
    return result;
  }

  private async downloadFile(file: GitHubFile): Promise<void> {
    if (!file.url) {
      console.warn(`⚠️  No download URL for ${file.repository.full_name}/${file.path}`);
      return;
    }

    try {
      console.log(`📥 Downloading: ${file.repository.full_name}/${file.path}`);
      
      const response = await fetch(file.url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      const base64 = json.content;
      const content = atob(base64);

      // Create filename: repository-name.openapi.yaml
      const repoName = file.repository.name.replace(/[^\w\-_]/g, '_');
      const filename = `${repoName}.openapi.yaml`;
      const filepath = join(this.outputDir, filename);
      
      await Deno.writeTextFile(filepath, content);
      console.log(`✅ Saved: ${filename}`);
      
    } catch (error) {
      console.error(`❌ Failed to download ${file.repository.full_name}/${file.path}: ${error.message}`);
    }
  }

  private async downloadAllFiles(files: GitHubFile[]): Promise<void> {
    console.log(`📦 Starting download of ${files.length} files...`);
    
    // Download files in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const promises = batch.map(file => this.downloadFile(file));
      
      await Promise.allSettled(promises);
      
      // Add a small delay between batches to be respectful to GitHub's API
      if (i + batchSize < files.length) {
        console.log(`⏳ Waiting before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async run(maxPages = 10, maxFiles?: number): Promise<void> {
    try {
      // Ensure output directory exists
      await ensureDir(this.outputDir);
      console.log(`📁 Output directory: ${this.outputDir}`);

      const allFiles: GitHubFile[] = [];
      let page = 1;
      let totalFound = 0;

      // Search and collect files from multiple pages
      while (page <= maxPages) {
        try {
          const result = await this.searchOpenAPIFiles(page);
          
          allFiles.push(...result.items);
          totalFound = result.total_count;
          
          // If this page has fewer items than the max, we've reached the end
          if (result.items.length < this.maxFilesPerPage) {
            break;
          }
          
          // If we have a max files limit and we've exceeded it, break
          if (maxFiles && allFiles.length >= maxFiles) {
            allFiles.splice(maxFiles);
            break;
          }
          
          page++;
          
          // Add delay between API calls
          if (page <= maxPages) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (error) {
          if (error.message.includes("rate limit")) {
            console.error(`❌ ${error.message}`);
            break;
          }
          throw error;
        }
      }

      console.log(`\n📊 Summary:`);
      console.log(`   Total files found: ${totalFound}`);
      console.log(`   Files to download: ${allFiles.length}`);
      
      if (allFiles.length === 0) {
        console.log("🤷 No files found to download.");
        return;
      }

      // Remove duplicates based on repository name
      const uniqueFiles = new Map<string, GitHubFile>();
      for (const file of allFiles) {
        const key = file.repository.name;
        if (!uniqueFiles.has(key)) {
          uniqueFiles.set(key, file);
        }
      }

      const filesToDownload = Array.from(uniqueFiles.values());
      console.log(`   Unique repositories: ${filesToDownload.length}`);

      // Download all files
      await this.downloadAllFiles(filesToDownload);
      
      console.log(`\n🎉 Download complete! Check the ${this.outputDir} directory.`);
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      Deno.exit(1);
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = Deno.args;
  let maxPages = 10;
  let maxFiles: number | undefined;

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--max-pages" && i + 1 < args.length) {
      maxPages = parseInt(args[i + 1]);
      i++;
    } else if (arg === "--max-files" && i + 1 < args.length) {
      maxFiles = parseInt(args[i + 1]);
      i++;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
GitHub OpenAPI Downloader

This tool downloads all files named "openapi.yaml" from GitHub repositories,
renames them to "{repository-name}.openapi.yaml", and saves them to ./openapi/gh/

Usage: deno run -A github_openapi_downloader.ts [options]

Options:
  --max-pages <number>  Maximum pages to search (default: 10)
  --max-files <number>  Maximum files to download (no limit by default)
  --help, -h           Show this help message

Required Environment Variables:
  GITHUB_TOKEN         GitHub personal access token (REQUIRED)
                      Create one at: https://github.com/settings/tokens
                      Needs 'public_repo' scope for searching public repositories

Examples:
  GITHUB_TOKEN=your_token deno run -A github_openapi_downloader.ts
  GITHUB_TOKEN=your_token deno run -A github_openapi_downloader.ts --max-pages 5
  GITHUB_TOKEN=your_token deno run -A github_openapi_downloader.ts --max-files 50
      `);
      Deno.exit(0);
    }
  }

  const downloader = new GitHubOpenAPIDownloader();
  await downloader.run(maxPages, maxFiles);
}