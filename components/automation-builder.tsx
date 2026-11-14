"use client";

import { useRef } from "react";
import { AnimatePresence, MotionConfig } from "motion/react";
import { AppDragChip } from "@/components/builder/app-drag-chip";
import { FlowCanvas, type CanvasApi } from "@/components/builder/canvas/flow-canvas";
import { ErrorToast } from "@/components/builder/error-toast";
import { PANEL_INSET, PropertiesPanel } from "@/components/builder/panel/properties-panel";
import { useAppDrag } from "@/components/builder/use-app-drag";
import { useRuleEditor } from "@/components/builder/use-rule-editor";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { appAction } from "@/lib/flow";

/** The Automations screen: navigation, the rule canvas and the selected step's panel. */
export function AutomationBuilder() {
  const editor = useRuleEditor();
  const canvasApi = useRef<CanvasApi | null>(null);
  const appDrag = useAppDrag({
    canvasApi,
    steps: editor.steps,
    onDropOnCanvas: ({ app, x, y, parentId }) =>
      editor.addStepAfter(parentId, { app: app.key, at: { x, y } }),
    onDropOnStep: (app) => editor.addActionToSelected(appAction(app)),
  });

  const { selected } = editor;
  const inset = selected ? PANEL_INSET : 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-dvh overflow-hidden bg-white text-ink">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar name={editor.doc.name} status={editor.status} onSave={editor.save} />
          <main className="relative min-h-0 flex-1 overflow-hidden">
            <FlowCanvas
              steps={editor.steps}
              links={editor.doc.links}
              selectedId={selected?.id ?? null}
              onSelect={editor.select}
              onMoveStep={editor.moveStep}
              onAddStep={editor.continueFrom}
              onDeleteStep={editor.deleteStep}
              takenRoles={editor.pathRoles}
              onRoleChange={editor.changePathRole}
              name={editor.doc.name}
              onRename={editor.rename}
              canUndo={editor.canUndo}
              canRedo={editor.canRedo}
              onUndo={editor.undo}
              onRedo={editor.redo}
              inset={inset}
              dropPreview={appDrag.drag?.preview ?? null}
              shake={editor.refused}
              apiRef={canvasApi}
            />

            <AnimatePresence>
              {selected && (
                <PropertiesPanel
                  key="panel"
                  step={selected}
                  conditions={editor.doc.conditions}
                  onConditionsChange={editor.setConditions}
                  paths={editor.paths}
                  onSelectStep={editor.select}
                  onAddPath={editor.canAddPath ? () => editor.addPathTo(selected.id) : undefined}
                  onPathRoleChange={editor.changePathRole}
                  onAudienceChange={editor.changeAudience}
                  onAddAction={editor.addActionToSelected}
                  onActionsChange={editor.setSelectedActions}
                  appDropActive={appDrag.drag?.overStep ?? false}
                  onAppPointerDown={appDrag.startDrag}
                  onAppClick={(app) => {
                    if (!appDrag.isDragClick()) editor.addActionToSelected(appAction(app));
                  }}
                  onDelete={() => editor.deleteStep(selected.id)}
                  onClose={() => editor.select(null)}
                />
              )}
            </AnimatePresence>

            <ErrorToast refused={editor.refused} inset={inset} onDismiss={editor.dismissRefusal} />
          </main>
        </div>
      </div>

      <AppDragChip drag={appDrag.drag} />
    </MotionConfig>
  );
}
