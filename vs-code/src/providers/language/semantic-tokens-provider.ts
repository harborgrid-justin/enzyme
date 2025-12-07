import * as vscode from 'vscode';
import { getParser } from './parser';
import { getIndex } from './enzyme-index';

/**
 * Semantic token types for Enzyme
 */
export enum EnzymeSemanticTokenTypes {
  Route = 'enzymeRoute',
  Hook = 'enzymeHook',
  Feature = 'enzymeFeature',
  Store = 'enzymeStore',
  Api = 'enzymeApi',
}

/**
 * Semantic token modifiers for Enzyme
 */
export enum EnzymeSemanticTokenModifiers {
  Definition = 'definition',
  Reference = 'reference',
}

/**
 * EnzymeSemanticTokensProvider - Provides semantic tokens for enhanced syntax highlighting
 * Highlights Enzyme-specific constructs with custom token types
 */
export class EnzymeSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
  private readonly legend: vscode.SemanticTokensLegend;

  constructor() {
    // Define token types and modifiers
    const tokenTypes = [
      EnzymeSemanticTokenTypes.Route,
      EnzymeSemanticTokenTypes.Hook,
      EnzymeSemanticTokenTypes.Feature,
      EnzymeSemanticTokenTypes.Store,
      EnzymeSemanticTokenTypes.Api,
    ];

    const tokenModifiers = [
      EnzymeSemanticTokenModifiers.Definition,
      EnzymeSemanticTokenModifiers.Reference,
    ];

    this.legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
  }

  /**
   * Get the semantic tokens legend
   */
  public getLegend(): vscode.SemanticTokensLegend {
    return this.legend;
  }

  /**
   * Provide semantic tokens for a document
   */
  public async provideDocumentSemanticTokens(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.SemanticTokens | undefined> {
    const tokensBuilder = new vscode.SemanticTokensBuilder(this.legend);

    try {
      // Parse document
      const parser = getParser();
      const result = parser.parseDocument(document);

      // Add route tokens
      result.routes.forEach(route => {
        this.addToken(
          tokensBuilder,
          route.range,
          EnzymeSemanticTokenTypes.Route,
          [EnzymeSemanticTokenModifiers.Definition]
        );
      });

      // Add hook tokens
      result.hooks.forEach(hook => {
        this.addToken(
          tokensBuilder,
          hook.range,
          EnzymeSemanticTokenTypes.Hook,
          [EnzymeSemanticTokenModifiers.Reference]
        );
      });

      // Add store tokens
      result.stores.forEach(store => {
        this.addToken(
          tokensBuilder,
          store.range,
          EnzymeSemanticTokenTypes.Store,
          [EnzymeSemanticTokenModifiers.Definition]
        );
      });

      // Add API tokens
      result.apis.forEach(api => {
        this.addToken(
          tokensBuilder,
          api.range,
          EnzymeSemanticTokenTypes.Api,
          [EnzymeSemanticTokenModifiers.Reference]
        );
      });

      // Add additional tokens from text analysis
      this.addTextBasedTokens(document, tokensBuilder);

    } catch (error) {
      console.error('Error providing semantic tokens:', error);
    }

    return tokensBuilder.build();
  }

  /**
   * Add a semantic token
   */
  private addToken(
    builder: vscode.SemanticTokensBuilder,
    range: vscode.Range,
    tokenType: string,
    tokenModifiers: string[]
  ): void {
    const modifiersBitset = this.encodeModifiers(tokenModifiers);

    builder.push(
      range.start.line,
      range.start.character,
      range.end.character - range.start.character,
      this.legend.tokenTypes.indexOf(tokenType),
      modifiersBitset
    );
  }

  /**
   * Encode token modifiers as bitset
   */
  private encodeModifiers(modifiers: string[]): number {
    let result = 0;
    modifiers.forEach(modifier => {
      const index = this.legend.tokenModifiers.indexOf(modifier);
      if (index !== -1) {
        result |= (1 << index);
      }
    });
    return result;
  }

  /**
   * Add tokens based on text analysis
   */
  private addTextBasedTokens(
    document: vscode.TextDocument,
    builder: vscode.SemanticTokensBuilder
  ): void {
    const text = document.getText();
    const lines = text.split('\n');

    lines.forEach((line, lineIndex) => {
      // Highlight routes.* references
      const routeMatches = line.matchAll(/routes\.(\w+)/g);
      for (const match of routeMatches) {
        if (match.index !== undefined) {
          builder.push(
            lineIndex,
            match.index + 'routes.'.length,
            match[1].length,
            this.legend.tokenTypes.indexOf(EnzymeSemanticTokenTypes.Route),
            this.encodeModifiers([EnzymeSemanticTokenModifiers.Reference])
          );
        }
      }

      // Highlight use* hook calls
      const hookMatches = line.matchAll(/\b(use[A-Z]\w*)\s*\(/g);
      for (const match of hookMatches) {
        if (match.index !== undefined) {
          builder.push(
            lineIndex,
            match.index,
            match[1].length,
            this.legend.tokenTypes.indexOf(EnzymeSemanticTokenTypes.Hook),
            this.encodeModifiers([EnzymeSemanticTokenModifiers.Reference])
          );
        }
      }

      // Highlight state.* references
      const storeMatches = line.matchAll(/state\.(\w+)/g);
      for (const match of storeMatches) {
        if (match.index !== undefined) {
          builder.push(
            lineIndex,
            match.index + 'state.'.length,
            match[1].length,
            this.legend.tokenTypes.indexOf(EnzymeSemanticTokenTypes.Store),
            this.encodeModifiers([EnzymeSemanticTokenModifiers.Reference])
          );
        }
      }

      // Highlight API method calls
      const apiMatches = line.matchAll(/\.(get|post|put|patch|delete)\s*\(/g);
      for (const match of apiMatches) {
        if (match.index !== undefined) {
          builder.push(
            lineIndex,
            match.index + 1, // Skip the '.'
            match[1].length,
            this.legend.tokenTypes.indexOf(EnzymeSemanticTokenTypes.Api),
            this.encodeModifiers([EnzymeSemanticTokenModifiers.Reference])
          );
        }
      }
    });
  }
}

/**
 * Get semantic token types and modifiers for theme configuration
 */
export function getSemanticTokensConfiguration(): {
  tokenTypes: string[];
  tokenModifiers: string[];
} {
  return {
    tokenTypes: [
      EnzymeSemanticTokenTypes.Route,
      EnzymeSemanticTokenTypes.Hook,
      EnzymeSemanticTokenTypes.Feature,
      EnzymeSemanticTokenTypes.Store,
      EnzymeSemanticTokenTypes.Api,
    ],
    tokenModifiers: [
      EnzymeSemanticTokenModifiers.Definition,
      EnzymeSemanticTokenModifiers.Reference,
    ],
  };
}
