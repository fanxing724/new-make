// GitHub REST API 返回的数据结构（只声明卡片用到的字段）

export interface GitHubUser {
  login: string;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepo {
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  fork: boolean;
  languages_url: string;
  created_at: string;
}

export interface GitHubEvent {
  id?: string;
  type: string;
  repo: { name: string };
  created_at: string;
  // payload.size 是推送的真实提交数;commits 数组会被 GitHub 截到最多 20 条
  payload: { size?: number; commits?: unknown[] };
}
