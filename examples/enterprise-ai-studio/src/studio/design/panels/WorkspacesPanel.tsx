import { useState, useMemo } from 'react';
import type { Team } from '../types';
import { useDesignStore } from '../store';
import {
  SectionHeader,
  Btn,
  TextInput,
  Card,
  EmptyHint,
} from '../ui';
import { toast } from '../../ui/toast';

function TeamRow({
  team,
  activeProjectId,
}: {
  team: Team;
  activeProjectId: string;
}): React.ReactElement {
  const setActiveScope = useDesignStore((s) => s.setActiveScope);
  const addProject = useDesignStore((s) => s.addProject);
  const [newProjectName, setNewProjectName] = useState('');
  const [showForm, setShowForm] = useState(false);

  function handleAddProject(): void {
    const name = newProjectName.trim();
    if (name === '') return;
    addProject(team.id, name);
    setNewProjectName('');
    setShowForm(false);
    toast.success(`Project "${name}" added to ${team.name}`);
  }

  return (
    <Card className="space-y-2">
      {/* Team header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-800">{team.name}</div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {team.members.map((m) => (
              <span
                key={m}
                className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
        <Btn variant="ghost" onClick={() => setShowForm((f) => !f)}>
          + Project
        </Btn>
      </div>

      {/* Project list */}
      {team.projects.length === 0 ? (
        <p className="pl-1 text-xs text-slate-400">No projects yet.</p>
      ) : (
        <div className="space-y-1 pl-1">
          {team.projects.map((proj) => {
            const isActive = proj.id === activeProjectId;
            return (
              <button
                key={proj.id}
                type="button"
                onClick={() => {
                  setActiveScope(team.id, proj.id);
                  toast.success(`Active: ${team.name} / ${proj.name}`);
                }}
                className={[
                  'w-full rounded-md px-3 py-1.5 text-left text-sm transition',
                  isActive
                    ? 'bg-indigo-50 font-semibold text-indigo-700 ring-1 ring-indigo-300'
                    : 'text-slate-700 hover:bg-slate-100',
                ].join(' ')}
              >
                {proj.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Add project form */}
      {showForm && (
        <div className="flex gap-2 pt-1">
          <div className="flex-1">
            <TextInput
              value={newProjectName}
              onChange={setNewProjectName}
              placeholder="New project name"
            />
          </div>
          <div className="flex items-end">
            <Btn variant="primary" onClick={handleAddProject} disabled={newProjectName.trim() === ''}>
              Add
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

export function WorkspacesPanel(): React.ReactElement {
  const workspace = useDesignStore((s) => s.workspace);
  const activeTeamId = useDesignStore((s) => s.activeTeamId);
  const activeProjectId = useDesignStore((s) => s.activeProjectId);
  const addTeam = useDesignStore((s) => s.addTeam);

  const [newTeamName, setNewTeamName] = useState('');

  const breadcrumb = useMemo(() => {
    const team = workspace.teams.find((t) => t.id === activeTeamId);
    const project = team?.projects.find((p) => p.id === activeProjectId);
    if (team == null) return workspace.name;
    if (project == null) return `${workspace.name} / ${team.name}`;
    return `${workspace.name} / ${team.name} / ${project.name}`;
  }, [workspace, activeTeamId, activeProjectId]);

  function handleAddTeam(): void {
    const name = newTeamName.trim();
    if (name === '') return;
    addTeam(name);
    setNewTeamName('');
    toast.success(`Team "${name}" created`);
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title={workspace.name}
        subtitle="Shared workspaces and project folders"
      />

      {/* Breadcrumb */}
      <div className="rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 truncate">
        {breadcrumb}
      </div>

      {/* Teams + projects */}
      {workspace.teams.length === 0 ? (
        <EmptyHint>No teams yet. Add one below.</EmptyHint>
      ) : (
        <div className="space-y-3">
          {workspace.teams.map((team) => (
            <TeamRow
              key={team.id}
              team={team}
              activeProjectId={activeProjectId}
            />
          ))}
        </div>
      )}

      {/* Add team */}
      <Card>
        <div className="mb-2 text-xs font-semibold text-slate-600">Add team</div>
        <div className="flex gap-2">
          <div className="flex-1">
            <TextInput
              value={newTeamName}
              onChange={setNewTeamName}
              placeholder="Team name"
            />
          </div>
          <div className="flex items-end">
            <Btn variant="primary" onClick={handleAddTeam} disabled={newTeamName.trim() === ''}>
              Add
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
