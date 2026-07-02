// Server-only Jira REST client (Cycle 14). Powers "Send to Jira" — create or
// update the comp/code/send issues for a campaign's deliverables.
//
// NEVER import this into client code: it reads JIRA_API_TOKEN. Auth is a Jira
// Cloud API token (Basic: email:token). Config via server env:
//   JIRA_BASE_URL     e.g. https://wengercorp.atlassian.net
//   JIRA_EMAIL        the token owner's Atlassian email
//   JIRA_API_TOKEN    from id.atlassian.com/manage-profile/security/api-tokens
//   JIRA_PROJECT_KEY  e.g. MARCOM
// Uses REST v2 so descriptions can be plain text (v3 requires ADF).
import "server-only";

export type JiraEnv = {
  baseUrl: string;
  email: string;
  token: string;
  projectKey: string;
};

/** The configured Jira env, or null when any piece is missing. */
export function jiraEnv(): JiraEnv | null {
  const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, "");
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;
  if (!baseUrl || !email || !token || !projectKey) return null;
  return { baseUrl, email, token, projectKey };
}

export const jiraConfigured = (): boolean => jiraEnv() !== null;

// Deliverable-chain owner → Jira accountId. These accountIds are not secret;
// override per-name via JIRA_ASSIGNEES (JSON: {"Owner Name":"accountId"}).
const DEFAULT_ASSIGNEES: Record<string, string> = {
  "Chris Klett": "712020:a8e76fa7-9443-4f8f-8f48-03afd5f47c6d",
  "Adam Bengtson": "712020:a8e7cbdf-33ec-45b2-977d-237c336102ff",
  Tami: "712020:8c7911c2-12d5-4bd4-bdc4-ee85179ae2d3",
  "Tami Roberts": "712020:8c7911c2-12d5-4bd4-bdc4-ee85179ae2d3",
};

export function assigneeAccountId(owner: string | null | undefined): string | undefined {
  if (!owner) return undefined;
  let overrides: Record<string, string> = {};
  try {
    overrides = process.env.JIRA_ASSIGNEES ? JSON.parse(process.env.JIRA_ASSIGNEES) : {};
  } catch {
    // malformed JIRA_ASSIGNEES — fall back to defaults
  }
  return overrides[owner] ?? DEFAULT_ASSIGNEES[owner];
}

function authHeader(env: JiraEnv): string {
  return "Basic " + Buffer.from(`${env.email}:${env.token}`).toString("base64");
}

export type IssueFields = {
  summary: string;
  description: string;
  due: string | null; // yyyy-mm-dd
  assigneeId?: string;
};

function buildFields(env: JiraEnv, f: IssueFields, forCreate: boolean) {
  const fields: Record<string, unknown> = {
    summary: f.summary,
    description: f.description || undefined,
  };
  if (forCreate) {
    fields.project = { key: env.projectKey };
    fields.issuetype = { name: "Task" };
  }
  if (f.due) fields.duedate = f.due;
  if (f.assigneeId) fields.assignee = { accountId: f.assigneeId };
  return fields;
}

async function jiraFetch(env: JiraEnv, path: string, init: RequestInit) {
  const res = await fetch(`${env.baseUrl}/rest/api/2${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(env),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  return res;
}

/** Create a new issue; returns its key. Throws with Jira's message on failure. */
export async function createIssue(env: JiraEnv, f: IssueFields): Promise<string> {
  const res = await jiraFetch(env, "/issue", {
    method: "POST",
    body: JSON.stringify({ fields: buildFields(env, f, true) }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(jiraErr(body, res.status));
  return body.key as string;
}

/** Update an existing issue in place. Returns the key on success. */
export async function updateIssue(env: JiraEnv, key: string, f: IssueFields): Promise<string> {
  const res = await jiraFetch(env, `/issue/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ fields: buildFields(env, f, false) }),
  });
  if (res.status === 404) return ""; // issue was deleted in Jira — signal recreate
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(jiraErr(body, res.status));
  }
  return key;
}

function jiraErr(body: unknown, status: number): string {
  const b = body as { errorMessages?: string[]; errors?: Record<string, string> };
  const msgs = [
    ...(b?.errorMessages ?? []),
    ...Object.values(b?.errors ?? {}),
  ];
  return `Jira ${status}: ${msgs.join("; ") || "request failed"}`;
}
