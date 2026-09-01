export type ProjectRefDto = { id: string; name: string };

export type ProjectActionCapabilitiesDto = {
  canEditProject: boolean;
  canCreateNote: boolean;
  canCreateMaterial: boolean;
  canCreateActivity: boolean;
  canCreateTask: boolean;
  canManagePeople: boolean;
  canPublish: boolean;
  canManageLibraryOperators: boolean;
  isLibraryOperator: boolean;
};

export type AppProjectDto = ProjectRefDto & {
  researchLens: string;
  description: string | null;
  status: "active" | "paused" | "completed" | "archived";
  researchReadable: boolean;
  operationalMember: boolean;
  features: { libraryCirculation: boolean };
  capabilities: ProjectActionCapabilitiesDto;
};

export type DraftDto = {
  id: string;
  noteId: string | null;
  projectId: string;
  title: string;
  summary: string | null;
  contentMd?: string;
  researchPurpose: "evidence" | "synthesis" | null;
  version: number;
  authorPrivate: true;
  status: string;
};

export type PublicationStatusDto = {
  state: "never_published" | "published_current" | "published_with_changes" | "unpublished";
  slug: string | null;
  revisionNumber: number | null;
  sourceNoteVersionId: string | null;
  hasUnpublishedChanges: boolean;
};
