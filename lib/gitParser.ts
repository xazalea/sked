/**
 * Git Repository Parser
 * Processes Git repositories to extract files, commits, and structure
 */

export interface RepositoryFile {
  path: string;
  content: string;
  size: number;
  type: 'file' | 'directory';
}

export interface CommitInfo {
  oid: string;
  message: string;
  author: string;
  timestamp: number;
  files: string[];
}

export interface RepositoryData {
  files: RepositoryFile[];
  commits: CommitInfo[];
  structure: string;
  totalFiles: number;
  totalSize: number;
}

export class GitRepositoryParser {
  private async readDirectory(
    fs: any,
    dir: string,
    files: RepositoryFile[] = []
  ): Promise<RepositoryFile[]> {
    try {
      const entries = await fs.promises.readdir(dir);
      
      for (const entry of entries) {
        const fullPath = `${dir}/${entry}`;
        
        try {
          const stats = await fs.promises.stat(fullPath);
          
          if (stats.isDirectory()) {
            // Skip .git directory
            if (entry === '.git') continue;
            files.push({
              path: fullPath,
              content: '',
              size: 0,
              type: 'directory'
            });
            await this.readDirectory(fs, fullPath, files);
          } else {
            try {
              const content = await fs.promises.readFile(fullPath, 'utf-8');
              // Check if content is likely binary (contains null bytes)
              // Only skip if it's definitely binary, otherwise try to read everything
              if (content.indexOf('\0') !== -1 && content.length > 0) {
                 // It's binary, skip
              } else {
                files.push({
                  path: fullPath,
                  content,
                  size: content.length,
                  type: 'file'
                });
              }
            } catch (err) {
              // Skip binary files or files that can't be read
              console.warn(`Skipping file ${fullPath}:`, err);
            }
          }
        } catch (err) {
          console.warn(`Error processing ${fullPath}:`, err);
        }
      }
    } catch (err) {
      console.warn(`Error reading directory ${dir}:`, err);
    }
    
    return files;
  }

  private buildStructure(files: RepositoryFile[]): string {
    const tree: Record<string, any> = {};
    
    for (const file of files) {
      const parts = file.path.split('/').filter(p => p);
      let current = tree;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = file.type === 'file' ? 'FILE' : 'DIR';
        } else {
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      }
    }
    
    const formatTree = (obj: any, indent = 0): string => {
      let result = '';
      const spaces = '  '.repeat(indent);
      
      for (const [key, value] of Object.entries(obj)) {
        if (value === 'FILE' || value === 'DIR') {
          result += `${spaces}${key}${value === 'DIR' ? '/' : ''}\n`;
        } else {
          result += `${spaces}${key}/\n`;
          result += formatTree(value, indent + 1);
        }
      }
      
      return result;
    };
    
    return formatTree(tree);
  }

  async parseRepository(repoPath: string, fs: any): Promise<RepositoryData> {
    const files = await this.readDirectory(fs, repoPath);
    const structure = this.buildStructure(files);
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    
    // For now, we'll extract basic commit info if possible
    // Full commit history parsing would require more complex Git operations
    const commits: CommitInfo[] = [];
    
    return {
      files,
      commits,
      structure,
      totalFiles: files.filter(f => f.type === 'file').length,
      totalSize
    };
  }

  formatRepositoryContext(data: RepositoryData): string {
    let context = `# Repository Analysis Context\n\n`;
    context += `## Repository Structure\n\`\`\`\n${data.structure}\`\`\`\n\n`;
    context += `## Statistics\n`;
    context += `- Total Files: ${data.totalFiles}\n`;
    context += `- Total Size: ${(data.totalSize / 1024).toFixed(2)} KB\n\n`;
    
    context += `## Files and Content\n\n`;
    
    // Include all file contents without truncation
    for (const file of data.files) {
      if (file.type === 'file') {
        context += `### ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
      }
    }
    
    return context;
  }
}

