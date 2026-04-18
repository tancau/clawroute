import type { Tool, PermissionContext } from './types';

/**
 * 工具注册中心
 * 管理所有可用工具的注册、查找和过滤
 */
class ToolRegistryImpl {
  private tools: Map<string, Tool> = new Map();

  /**
   * 注册工具
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool ${tool.name} already registered, overwriting`);
    }
    this.tools.set(tool.name, tool);

    // 注册别名
    if (tool.aliases) {
      for (const alias of tool.aliases) {
        this.tools.set(alias, tool);
      }
    }
  }

  /**
   * 批量注册工具
   */
  registerAll(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * 获取工具
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 获取所有工具（去重）
   */
  getAll(): Tool[] {
    const unique = new Set<Tool>();
    for (const tool of Array.from(this.tools.values())) {
      unique.add(tool);
    }
    return Array.from(unique);
  }

  /**
   * 获取启用的工具
   */
  getEnabled(context?: PermissionContext): Tool[] {
    return this.getAll().filter((tool) => {
      // 检查工具是否启用
      if (!tool.isEnabled()) return false;

      // 检查权限
      if (context) {
        if (context.deniedTools.has(tool.name)) return false;
        if (
          context.allowedTools.size > 0 &&
          !context.allowedTools.has(tool.name)
        ) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 获取工具列表（用于 API 暴露）
   */
  list(): Array<{
    name: string;
    description: string;
    aliases?: string[];
    isReadOnly: boolean;
    isDestructive: boolean;
  }> {
    return this.getAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
      aliases: tool.aliases,
      isReadOnly: tool.isReadOnly({} as never),
      isDestructive: tool.isDestructive?.({} as never) ?? false,
    }));
  }
}

// 单例导出
export const toolRegistry = new ToolRegistryImpl();
