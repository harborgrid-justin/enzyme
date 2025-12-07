import * as vscode from 'vscode';
import { RouteQuickFixes } from './quick-fixes/route-quick-fixes';
import { ComponentQuickFixes } from './quick-fixes/component-quick-fixes';
import { HookQuickFixes } from './quick-fixes/hook-quick-fixes';
import { StoreQuickFixes } from './quick-fixes/store-quick-fixes';
import { ImportQuickFixes } from './quick-fixes/import-quick-fixes';
import { ExtractFeatureRefactoring } from './refactorings/extract-feature';
import { ExtractHookRefactoring } from './refactorings/extract-hook';
import { ConvertToLazyRouteRefactoring } from './refactorings/convert-to-lazy-route';

export class EnzymeCodeActionProvider implements vscode.CodeActionProvider {
  private routeQuickFixes: RouteQuickFixes;
  private componentQuickFixes: ComponentQuickFixes;
  private hookQuickFixes: HookQuickFixes;
  private storeQuickFixes: StoreQuickFixes;
  private importQuickFixes: ImportQuickFixes;
  private extractFeatureRefactoring: ExtractFeatureRefactoring;
  private extractHookRefactoring: ExtractHookRefactoring;
  private convertToLazyRouteRefactoring: ConvertToLazyRouteRefactoring;

  constructor() {
    this.routeQuickFixes = new RouteQuickFixes();
    this.componentQuickFixes = new ComponentQuickFixes();
    this.hookQuickFixes = new HookQuickFixes();
    this.storeQuickFixes = new StoreQuickFixes();
    this.importQuickFixes = new ImportQuickFixes();
    this.extractFeatureRefactoring = new ExtractFeatureRefactoring();
    this.extractHookRefactoring = new ExtractHookRefactoring();
    this.convertToLazyRouteRefactoring = new ConvertToLazyRouteRefactoring();
  }

  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.Refactor,
    vscode.CodeActionKind.Source,
  ];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    const actions: vscode.CodeAction[] = [];

    // Quick Fixes - respond to diagnostics
    if (context.diagnostics && context.diagnostics.length > 0) {
      actions.push(...this.routeQuickFixes.provideQuickFixes(document, range, context));
      actions.push(...this.componentQuickFixes.provideQuickFixes(document, range, context));
      actions.push(...this.hookQuickFixes.provideQuickFixes(document, range, context));
      actions.push(...this.storeQuickFixes.provideQuickFixes(document, range, context));
    }

    // Import quick fixes - always available
    actions.push(...this.importQuickFixes.provideQuickFixes(document, range, context));

    // Refactorings - context-aware
    if (context.only && context.only.contains(vscode.CodeActionKind.Refactor)) {
      actions.push(
        ...this.extractFeatureRefactoring.provideRefactorings(document, range, context)
      );
      actions.push(...this.extractHookRefactoring.provideRefactorings(document, range, context));
      actions.push(
        ...this.convertToLazyRouteRefactoring.provideRefactorings(document, range, context)
      );
    }

    // Sort by priority
    return this.sortActionsByPriority(actions);
  }

  private sortActionsByPriority(actions: vscode.CodeAction[]): vscode.CodeAction[] {
    const priorityMap: Record<string, number> = {
      [vscode.CodeActionKind.QuickFix.value]: 1,
      [vscode.CodeActionKind.Refactor.value]: 2,
      [vscode.CodeActionKind.Source.value]: 3,
    };

    return actions.sort((a, b) => {
      const aPriority = priorityMap[a.kind?.value || ''] || 999;
      const bPriority = priorityMap[b.kind?.value || ''] || 999;
      return aPriority - bPriority;
    });
  }
}
