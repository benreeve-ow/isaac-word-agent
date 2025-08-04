/**
 * Builder for composing prompts from components
 */

import { PromptComponent, PromptTemplate } from './PromptTypes';

export class PromptBuilder {
  private components: PromptComponent[] = [];

  /**
   * Add a component to the prompt
   */
  addComponent(component: PromptComponent): this {
    this.components.push(component);
    return this;
  }

  /**
   * Add multiple components
   */
  addComponents(components: PromptComponent[]): this {
    this.components.push(...components);
    return this;
  }

  /**
   * Add raw text as an instruction
   */
  addInstruction(content: string): this {
    this.components.push({
      type: 'instruction',
      content
    });
    return this;
  }

  /**
   * Add a constraint
   */
  addConstraint(content: string, priority?: number): this {
    this.components.push({
      type: 'constraint',
      content,
      priority
    });
    return this;
  }

  /**
   * Build the final prompt string
   */
  build(): string {
    // Sort by priority (higher priority first)
    const sorted = [...this.components].sort((a, b) => 
      (b.priority || 0) - (a.priority || 0)
    );

    // Group by type for better organization
    const groups = {
      system: [] as string[],
      instruction: [] as string[],
      constraint: [] as string[],
      example: [] as string[],
      format: [] as string[]
    };

    sorted.forEach(component => {
      groups[component.type].push(component.content);
    });

    // Build the final prompt with sections
    const sections: string[] = [];

    if (groups.system.length > 0) {
      sections.push(groups.system.join('\n\n'));
    }

    if (groups.instruction.length > 0) {
      sections.push('## Instructions\n' + groups.instruction.join('\n\n'));
    }

    if (groups.constraint.length > 0) {
      sections.push('## Constraints\n' + groups.constraint.join('\n\n'));
    }

    if (groups.example.length > 0) {
      sections.push('## Examples\n' + groups.example.join('\n\n'));
    }

    if (groups.format.length > 0) {
      sections.push('## Output Format\n' + groups.format.join('\n\n'));
    }

    return sections.join('\n\n').trim();
  }

  /**
   * Create a builder from a template
   */
  static fromTemplate(template: PromptTemplate): PromptBuilder {
    const builder = new PromptBuilder();
    builder.addComponents(template.components);
    return builder;
  }
}