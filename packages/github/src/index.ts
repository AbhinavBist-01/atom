export interface GitHubIssue {
  id: string;
  number: number;
  title: string;
  body: string;
  state: string;
}

export function createOctokitClient(auth: string) {
  return {
    auth,
    status: "initialized"
  };
}
