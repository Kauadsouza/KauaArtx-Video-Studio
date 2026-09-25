'use client';
import './member-access.css';
import { useEffect, useState, type ReactNode } from 'react';

export type AccountSession = { token: string; principal: string; owner: boolean; username?: string };
// Shared by the account-specific workspace wrapper in this application.
/* O serviço de contas é do Hub. Este sistema não fala com nenhum outro
   sistema — só com o Hub, que é o único ponto que centraliza. */
export const MEMBER_API = 'https://artx-hub.vercel.app/api/contas';
export async function accountRequest(action: string, app: string, data: Record<string, unknown> = {}, token = '') {
  const response = await fetch(MEMBER_API, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ ...data, action, app }), signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir.');
  return result;
}
export function cachedAccount(app: string): AccountSession | null {
  try { return JSON.parse(sessionStorage.getItem(`artx-account:${app}`) ?? 'null'); } catch { return null; }
}
/**
 * Grava (ou apaga) o cookie deste domínio.
 *
 * O login acontece no Hub, e cookie não atravessa domínio. As páginas do
 * sistema de vídeos dependem do cookie para saber de quem é a sessão no
 * servidor, então o token dá uma parada aqui antes de a tela recarregar.
 *
 * Os outros sistemas não têm cookie próprio e não chamam isto.
 */
async function gravarCookieLocal(app: string, token: string | null) {
  if (app !== 'videos') return;
  try {
    await fetch('/api/sessao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), signal: AbortSignal.timeout(20000) });
  } catch {
    // Sem o cookie a pessoa cai na tela de entrar de novo, que é o certo —
    // melhor do que uma tela que abre e falha em cada gravação.
  }
}

export function MemberAccess({ app, children }: { app: 'videos' | 'study' | 'university'; children: (session: AccountSession) => ReactNode }) {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [ready, setReady] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [waitingApproval, setWaitingApproval] = useState(false);
  const [denied, setDenied] = useState(false);
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => {
    let active = true;
    const saved = cachedAccount(app);
    if (saved?.token) void accountRequest('session', app, {}, saved.token).then(result => { if (active) { const verified = { ...saved, ...result }; sessionStorage.setItem(`artx-account:${app}`, JSON.stringify(verified)); setSession(verified); } }).catch(() => { if (active) { sessionStorage.removeItem(`artx-account:${app}`); setMessage('Entre novamente para continuar.'); } }).finally(() => { if (active) setReady(true); });
    else queueMicrotask(() => { if (active) setReady(true); });
    async function receive(event: MessageEvent) {
      if (event.origin !== 'https://artx-hub.vercel.app' || event.source !== window.parent) return;
      try {
        if (event.data?.type === 'ARTX_HUB_AUTH' && typeof event.data.accessToken === 'string') {
          const verified = await accountRequest('owner', app, {}, event.data.accessToken);
          if (active) { sessionStorage.setItem(`artx-account:${app}`, JSON.stringify(verified)); setSession(verified); setReady(true); }
        } else if (event.data?.type === 'ARTX_MEMBER_AUTH' && typeof event.data.token === 'string') {
          const verified = await accountRequest('session', app, {}, event.data.token);
          if (verified.owner) throw new Error('Sessão inválida.');
          await gravarCookieLocal(app, event.data.token);
          if (active) { const member = { ...verified, token: event.data.token }; sessionStorage.setItem(`artx-account:${app}`, JSON.stringify(member)); setSession(member); setReady(true); }
        }
      } catch { if (active) setMessage('Não foi possível confirmar seu acesso pelo Hub.'); }
    }
    window.addEventListener('message', receive);
    if (window.parent !== window) window.parent.postMessage({ type: app === 'study' ? 'ARTX_STUDY_EMBED_READY' : app === 'university' ? 'UNIVERSITY_PATH_EMBED_READY' : 'ARTX_VIDEO_EMBED_READY' }, 'https://artx-hub.vercel.app');
    return () => { active = false; window.removeEventListener('message', receive); };
  }, [app]);
  if (!ready) return <main className="account-access"><p>Confirmando seu acesso…</p></main>;
  if (session) return <><div className="account-session"><span>{session.owner ? 'Meu espaço privado' : `Conta: ${session.username ?? session.principal.slice(0,8)}`}</span><button onClick={async () => { try { await accountRequest('logout', app, {}, session.token); await gravarCookieLocal(app, null); sessionStorage.removeItem(`artx-account:${app}`); window.location.reload(); } catch { setMessage('Não foi possível sair. Tente novamente.'); } }}>Sair</button><span role="status">{message}</span></div>{children(session)}</>;
  function backToLogin() { setWaitingApproval(false); setDenied(false); setCreating(false); setMessage(''); }
  if (denied) return <main className="account-access"><section className="pending-access denied" role="status"><div className="pending-symbol">!</div><span>ACESSO NÃO LIBERADO</span><h1>Este sistema não está liberado para você.</h1><p>{message || 'Fale com o administrador.'}</p><div className="pending-steps"><strong>Não adianta esperar.</strong><p>A decisão já foi tomada. Se isso for engano, peça ao proprietário para liberar este sistema para a sua conta no Hub.</p></div><button type="button" onClick={backToLogin}>Voltar</button></section></main>;
  if (waitingApproval) return <main className="account-access"><section className="pending-access" role="status"><div className="pending-symbol">✓</div><span>CONTA RECEBIDA</span><h1>Aguardando aprovação.</h1><p>{message || 'Seu pedido está na fila privada do proprietário.'}</p><div className="pending-steps"><strong>O que acontece agora?</strong><p>O proprietário revisa o pedido no ARTX Hub. Depois de aprovado, volte e entre com o mesmo nome e senha.</p></div><button type="button" onClick={backToLogin}>Já fui liberado · entrar</button></section></main>;
  return <main className="account-access"><form onSubmit={async event => {
    event.preventDefault(); if (pending) return; setPending(true); setMessage('');
    try {
      const result = await accountRequest(creating ? 'register' : 'login', app, { username, password });
      if (result.pending) { setMessage(result.message); if (result.state === 'denied') setDenied(true); else setWaitingApproval(true); }
      else { await gravarCookieLocal(app, result.token); sessionStorage.setItem(`artx-account:${app}`, JSON.stringify(result)); window.location.reload(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível entrar.'); }
    finally { setPending(false); setPassword(''); }
  }}><span>ARTX / {app === 'study' ? 'INGLÊS' : app === 'university' ? 'UNIVERSIDADES' : 'VÍDEOS'}</span><h1>{creating ? 'Crie seu espaço.' : 'Seu espaço é só seu.'}</h1><p>{creating ? 'O acesso fica pendente até o administrador aprovar no Hub.' : 'Entre com seu nome de usuário e senha.'}</p><label>Nome de usuário<input autoComplete="username" required minLength={3} maxLength={32} pattern="[a-zA-Z0-9][a-zA-Z0-9_.-]{2,31}" value={username} onChange={e => setUsername(e.target.value)} /></label><label>Senha<input type="password" autoComplete={creating ? 'new-password' : 'current-password'} required minLength={10} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label><p role="status">{message}</p><button disabled={pending}>{pending ? 'Aguarde…' : creating ? 'Pedir aprovação' : 'Entrar'}</button><button type="button" disabled={pending} onClick={() => { setCreating(!creating); setMessage(''); }}>{creating ? 'Já tenho uma conta' : 'Criar conta'}</button><small>Esqueceu a senha? Fale com o administrador. Nunca envie sua senha por mensagem.</small><a href="https://artx-hub.vercel.app" target="_top">Sou o proprietário · abrir Hub ↗</a></form></main>;
}
