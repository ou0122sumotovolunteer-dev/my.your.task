// assets/common.js
// 必要: ブラウザで PAT を入力して localStorage に保存して使います。
// 設定項目（あなたの環境に合わせて変更）
const GITHUB_OWNER = 'YOUR_GITHUB_USERNAME'; // ここを自分のユーザー名に変える
const GITHUB_REPO  = 'YOUR_REPO_NAME';       // ここを自分のリポジトリ名に変える
const BRANCH = 'main';

function getToken() {
  return localStorage.getItem('gh_pat') || '';
}
function setToken(t) {
  localStorage.setItem('gh_pat', t);
}
function clearToken() {
  localStorage.removeItem('gh_pat');
}

async function githubRequest(path, method='GET', body=null) {
  const token = getToken();
  if (!token) throw new Error('GitHub PAT が設定されていません（create.html または admin.html で設定してください）。');
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API エラー: ${res.status} ${res.statusText}\n${text}`);
  }
  return res.json();
}

// ファイルの取得（contents API） - base64 デコードして返す
async function getFile(path) {
  try {
    const j = await githubRequest(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`);
    if (j && j.content) {
      const content = atob(j.content.replace(/\n/g,''));
      return { content, sha: j.sha, full: j };
    }
    return null;
  } catch (e) {
    if (e.message && e.message.includes('404')) return null;
    throw e;
  }
}

// ファイル作成 or 更新
// path: 'data/events/{id}.json'
async function putFile(path, contentText, message='update via web') {
  // contentText を base64 にして PUT
  const b64 = btoa(unescape(encodeURIComponent(contentText)));
  // 既存の sha を取得（無ければ新規作成）
  const existing = await getFile(path);
  const body = {
    message,
    content: b64,
    branch: BRANCH
  };
  if (existing && existing.sha) body.sha = existing.sha;
  const res = await githubRequest(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`, 'PUT', body);
  return res;
}
