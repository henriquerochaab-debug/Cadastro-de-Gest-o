/* ===== JavaScript ===== */
const KEY = "euterpe:filarmonica:v1";
const ic = {
  music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  grid:'<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
  swap:'<path d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3"/>',
  box:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  file:'<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h8"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  wrench:'<path d="M14 6a4 4 0 005 5l-9 9-3-3 9-9a4 4 0 00-2-2z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  clip:'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 2h6v4H9zM9 12h6M9 16h6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  out:'<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>'
};
const I = n => `<svg viewBox="0 0 24 24">${ic[n]}</svg>`;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const fd = d => d ? d.split("-").reverse().join("/") : "—";
const TIPOS_M = ["Instrumento","Mesa","Cadeira","Cadeira de escritório","Estante","Armário","Outro"];
const ESTADOS = ["Ótimo","Bom","Regular","Ruim","Em manutenção"];

const NOME = "Euterpe";
const AK = "euterpe:conta:v1", SK = "euterpe:sessao:v1";
const mem = {};
const store = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return mem[k] ?? null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
  del: k => { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } }
};
const TEMA = "euterpe:tema:v1";
const aplicaTema = t => { document.documentElement.dataset.theme = t; store.set(TEMA, t); };
document.documentElement.dataset.theme = store.get(TEMA) || "dark";
let db;
try { db = JSON.parse(store.get(KEY)); } catch (e) { db = null; }
db = db || {};
if (db.instrumentos) { // migra o cadastro antigo de instrumentos para Materiais
  db.materiais = (db.materiais || []).concat(db.instrumentos.map(i => ({id:i.id, tipo:"Instrumento", nome:[i.tipo, i.marca, i.modelo].filter(Boolean).join(" "), serie:"", estado:i.estado || "Bom", localizacao:i.localizacao || "", obs:+i.quantidade > 1 ? "Quantidade antiga: " + i.quantidade : ""})));
  delete db.instrumentos;
}
db.materiais = db.materiais || []; db.termos = db.termos || []; db.fichas = db.fichas || [];
const save = () => store.set(KEY, JSON.stringify(db));

/* ---- Conta e acesso (somente neste navegador, sem Google) ---- */
const conta = () => { try { return JSON.parse(store.get(AK)); } catch (e) { return null; } };
async function hash(senha, salt){
  const txt = salt + senha;
  if (window.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
  }
  let h = 5381; for (const c of txt) h = (h * 33) ^ c.charCodeAt(0);
  return String(h >>> 0);
}
function logout(){ store.del(SK); showAuth(); }
function showAuth(){
  const c = conta(), a = $("#auth");
  $(".app").hidden = true; a.hidden = false;
  a.innerHTML = `<form class="authbox" id="af">
    <div class="logo"><i><img src="simbolo.jpeg" alt=""></i><div><b>Euterpe</b><small>JAPARATUBENSE</small></div></div>
    <h1>${c ? "Entrar" : "Criar sua conta"}</h1>
    <p>${c ? "Digite seu usuário e sua senha para acessar o patrimônio." : "Primeiro acesso: escolha um usuário e uma senha. Não precisa de e-mail nem de conta Google."}</p>
    <label>Usuário<input name="usuario" autocomplete="username" required></label>
    <label>Senha<input name="senha" type="password" autocomplete="${c ? "current-password" : "new-password"}" minlength="${c ? 1 : 6}" required></label>
    ${c ? "" : `<label>Repetir senha<input name="senha2" type="password" autocomplete="new-password" required></label>`}
    <p class="err" id="err" role="alert"></p>
    <button class="btn">${c ? "Entrar" : "Criar conta e entrar"}</button>
    ${c ? `<button type="button" class="link" id="esq">Esqueci minha senha</button>` : ""}</form>`;
  const err = t => $("#err").textContent = t;
  $("#af").onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const usuario = f.usuario.trim();
    if (c) {
      const h = await hash(f.senha, c.salt);
      if (usuario.toLowerCase() !== c.usuario.toLowerCase() || h !== c.hash) return err("Usuário ou senha incorretos.");
    } else {
      if (f.senha.length < 6) return err("A senha precisa ter pelo menos 6 caracteres.");
      if (f.senha !== f.senha2) return err("As senhas não são iguais.");
      const salt = uid() + uid();
      store.set(AK, JSON.stringify({usuario, salt, hash: await hash(f.senha, salt)}));
    }
    store.set(SK, "1"); start();
  };
  if (c) $("#esq").onclick = () => {
    if (!confirm("Sem e-mail, não dá para recuperar a senha. A única saída é apagar todos os dados deste navegador e criar uma conta nova. Deseja apagar tudo?")) return;
    store.del(AK); store.del(KEY); store.del(SK); db = {materiais:[], termos:[], fichas:[]}; showAuth();
  };
}
function start(){ $("#auth").hidden = true; $(".app").hidden = false; render(); }
document.addEventListener("submit", async e => {
  if (e.target.id !== "pf") return;
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target)), c = conta();
  if (await hash(f.atual, c.salt) !== c.hash) return toast("Senha atual incorreta");
  c.salt = uid() + uid(); c.hash = await hash(f.nova, c.salt);
  store.set(AK, JSON.stringify(c)); e.target.reset(); toast("Senha alterada");
});
const toast = t => { const el = $("#toast"); el.textContent = t; el.classList.add("on"); setTimeout(() => el.classList.remove("on"), 1800); };
const mat = id => db.materiais.find(m => m.id === id);
const emPosse = () => db.termos.filter(t => !t.devolucao);
const ocupado = id => emPosse().some(t => t.materialId === id);
const instrs = () => db.materiais.filter(m => m.tipo === "Instrumento");
const LOCAIS = ["Pronto para uso","Depósito", "Escritório 1", "Escritório 2", "Escritório 3"];
const locais = tipo => tipo === "Instrumento" ? [...LOCAIS,"Pronto para uso", "Quebrado", "Manutenção"] : LOCAIS;
const locOpts = (l, v) => `<option value="">—</option>` + [...l, ...(v && !l.includes(v) ? [v] : [])].map(o => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("");
const indisp = m => m.estado === "Em manutenção" || m.localizacao === "Quebrado" || m.localizacao === "Manutenção";

/* ---- Navegação ---- */
const NAV = [["painel","Painel","grid"],["instrumentos","Instrumentos","music"],["materiais","Materiais","box"],["fichas","Ficha de cadastro","clip"],["relatorios","Relatórios","file"],["configuracoes","Configurações","gear"]];
$("#nav").innerHTML = NAV.map(n => `<a href="#${n[0]}" data-v="${n[0]}">${I(n[2])}<span>${n[1]}</span></a>`).join("");
$("#sair").innerHTML = I("out") + "Sair";
$("#sair").onclick = logout;

/* ---- Componentes ---- */
const hd = (eb, t, sub, b = "") => `<div class="head"><div><div class="eyebrow">${eb}</div><h1>${t}</h1><p>${sub}</p></div><div class="btns">${b}</div></div>`;
const stat = (l, v, s, i, g) => `<div class="card stat"><div><span>${l}</span>${I(i)}</div><b class="${g ? "g" : ""}">${v}</b><small>${s}</small></div>`;
const empty = (i, t, p) => `<div class="empty">${I(i)}<h2>${t}</h2><p>${p}</p></div>`;
const opts = (l, sel) => l.map(o => `<option ${o === sel ? "selected" : ""}>${o}</option>`).join("");
const acts = (t, id) => `<button class="btn out sm" data-edit="${t}:${id}">Editar</button><button class="btn bad sm" data-del="${t}:${id}">Excluir</button>`;
const bar = (ph, sels) => `<div class="card bar"><input data-f="q" placeholder="${ph}" aria-label="Buscar">${sels.map((s, k) => `<select data-f="${"ab"[k]}">${s.map((o, j) => `<option value="${j ? o[0] : ""}">${j ? o[1] : o}</option>`).join("")}</select>`).join("")}</div>`;
const estTag = e => `<span class="tag ${e === "Ótimo" || e === "Bom" ? "ok" : e === "Regular" ? "warn" : "bad"}">${e}</span>`;
let F = {q:"", a:"", b:""}, tab = 0;
const has = (q, ...c) => c.join(" ").toLowerCase().includes(q.toLowerCase());

/* ---- Listas filtráveis ---- */
const sel = (all, l) => [all, ...l.map(x => [x, x])];
const L = {
  instrumentos(){
    const l = db.termos.filter(t => has(F.q, t.musico, mat(t.materialId)?.nome, mat(t.materialId)?.serie) && (!F.a || (F.a === "posse" ? !t.devolucao : t.devolucao)));
    if (!l.length) return empty("clip", "Nenhum termo encontrado", "Registre a entrega de um instrumento ao músico com o termo de responsabilidade.");
    return `<div class="card tw"><table><thead><tr><th>Músico</th><th>Instrumento</th><th>Nº de série</th><th>Entrega</th><th>Situação</th><th></th></tr></thead><tbody>${l.map(t => { const m = mat(t.materialId); return `<tr><td>${esc(t.musico)}</td><td>${esc(m ? m.nome : "Item removido")}</td><td>${esc(m?.serie) || "—"}</td><td>${fd(t.entrega)}</td><td><span class="tag ${t.devolucao ? "ok" : "warn"}">${t.devolucao ? "Devolvido em " + fd(t.devolucao) : "Em posse do músico"}</span></td><td class="act">${t.devolucao ? `<button class="btn sm" data-print="devolucao:${t.id}">Termo de devolução</button>` : `<button class="btn sm" data-ret="${t.id}">Devolver</button>`}<button class="btn out sm" data-print="termos:${t.id}">Imprimir termo</button>${acts("termos", t.id)}</td></tr>`; }).join("")}</tbody></table></div>`;
  },
  materiais(){
    const l = db.materiais.filter(m => has(F.q, m.nome, m.marca, m.serie, m.localizacao) && (!F.a || m.tipo === F.a) && (!F.b || m.estado === F.b));
    if (!l.length) return empty("box", "Nenhum material encontrado", "Cadastre mesas, cadeiras, estantes, instrumentos e outros itens, cada um com seu número de série.");
    return `<div class="card tw"><table><thead><tr><th>Tipo</th><th>Descrição</th><th>Nº de série</th><th>Estado</th><th>Localização</th><th></th></tr></thead><tbody>${l.map(m => `<tr><td>${esc(m.tipo)}</td><td>${esc(m.nome)}${m.marca ? `<small>${esc(m.marca)}</small>` : ""}</td><td>${esc(m.serie) || "—"}</td><td>${estTag(m.estado)}</td><td>${esc(m.localizacao) || "—"}</td><td class="act">${acts("materiais", m.id)}</td></tr>`).join("")}</tbody></table></div>`;
  },
  fichas(){
    const l = db.fichas.filter(f => has(F.q, f.nome, f.cpf, f.celular, f.cidade) && (!F.a || f.sexo === F.a));
    if (!l.length) return empty("clip", "Nenhuma ficha encontrada", "Cadastre os dados dos músicos e alunos da filarmônica.");
    return `<div class="card tw"><table><thead><tr><th>Nome</th><th>CPF</th><th>Celular</th><th>Cidade</th><th>Cadastro</th><th></th></tr></thead><tbody>${l.map(f => `<tr><td>${esc(f.nome)}</td><td>${esc(f.cpf) || "—"}</td><td>${esc(f.celular) || "—"}</td><td>${esc(f.cidade) || "—"}</td><td>${fd(f.cadastro)}</td><td class="act"><button class="btn out sm" data-print="${f.id}">Imprimir</button>${acts("fichas", f.id)}</td></tr>`).join("")}</tbody></table></div>`;
  }
};

/* ---- Telas ---- */
const V = {
  painel(){
    const ins = instrs(), man = ins.filter(i => i.estado === "Em manutenção" || i.localizacao === "Manutenção").length, qb = ins.filter(i => i.localizacao === "Quebrado" && i.estado !== "Em manutenção").length, emp = emPosse().length, disp = ins.filter(i => !indisp(i) && !ocupado(i.id)).length;
    const d = new Date().toLocaleDateString("pt-BR", {weekday:"long", day:"numeric", month:"long"});
    return hd("Patrimônio · " + d, "Olá, " + NOME, "Instrumentos, materiais, termos de responsabilidade e fichas de cadastro da Sociedade Filarmônica Euterpe Japaratubense.",
      `<button class="btn" data-new="materiais">${I("plus")}Material</button><button class="btn out" data-new="termos">Termo</button><button class="btn out" data-new="fichas">Ficha</button>`) + `
      <div class="grid">${stat("Total de instrumentos", ins.length, "Cadastrados com número de série", "music", 1)}
      ${stat("Instrumentos disponíveis", disp, "Prontos para uso", "check")}
      ${stat("Instrumentos emprestados", emp, "Com termo de responsabilidade em aberto", "swap")}
      ${stat("Instrumentos em manutenção", man, "Aguardando conserto ou revisão", "wrench")}
      ${stat("Instrumentos quebrados", qb, "Fora de uso", "clock")}
      ${stat("Total de materiais", db.materiais.length - ins.length, "Mesas, cadeiras, estantes e outros", "box")}
      ${stat("Fichas cadastradas", db.fichas.length, "Músicos com ficha de cadastro", "clip")}</div>`;
  },
  instrumentos(){
    return hd("Patrimônio", "Instrumentos", "Termos de responsabilidade e de devolução dos instrumentos entregues aos músicos.", `<button class="btn" data-new="termos">${I("plus")}Termo de responsabilidade</button>`) +
      `<div class="grid two">${stat("Termos em aberto", emPosse().length, "Instrumentos com músicos neste momento", "clip", 1)}${stat("Termos emitidos", db.termos.length, "Total de termos registrados", "file")}</div>` +
      bar("Buscar por músico, instrumento ou número de série", [["Todos os termos", ["posse", "Em posse do músico"], ["dev", "Devolvidos"]]]) + `<div id="list">${L.instrumentos()}</div>`;
  },
  materiais(){
    const por = TIPOS_M.map(t => [t, db.materiais.filter(m => m.tipo === t).length]).filter(x => x[1]);
    return hd("Patrimônio", "Materiais", "Mesas, cadeiras, estantes, instrumentos e outros itens, cada um com seu número de série.", `<button class="btn" data-new="materiais">${I("plus")}Cadastrar material</button>`) +
      `<section class="card" style="margin-bottom:24px"><h2>Quantidade por tipo</h2><p>Total de itens cadastrados: ${db.materiais.length}</p>${por.length ? `<div class="chips">${por.map(x => `<span class="chip">${x[0]}<b>${x[1]}</b></span>`).join("")}</div>` : "Nenhum item cadastrado ainda."}</section>` +
      bar("Buscar por descrição, número de série ou localização", [sel("Todos os tipos", TIPOS_M), sel("Todos os estados", ESTADOS)]) + `<div id="list">${L.materiais()}</div>`;
  },
  fichas(){
    return hd("Cadastro", "Ficha de cadastro", "Dados pessoais dos músicos e alunos da filarmônica.", `<button class="btn" data-new="fichas">${I("plus")}Nova ficha</button>`) +
      `<div class="grid">${stat("Fichas cadastradas", db.fichas.length, "Músicos e alunos registrados", "clip", 1)}</div>` +
      bar("Buscar por nome, CPF, celular ou cidade", [["Todos os sexos", ["Masculino", "Masculino"], ["Feminino", "Feminino"]]]) + `<div id="list">${L.fichas()}</div>`;
  },
  relatorios(){
    const row = (a, b) => `<div class="row"><span>${a}</span><b>${b}</b></div>`, ins = instrs().length;
    return hd("Administração", "Relatórios", "Gere os levantamentos em PDF para imprimir ou arquivar.") + `<div class="grid two">
      <section class="card"><h2>Levantamento de instrumentos e materiais</h2><p>Lista completa com número de série, estado e localização.</p>${row("Instrumentos", ins)}${row("Outros materiais", db.materiais.length - ins)}<div class="btns" style="margin-top:16px"><button class="btn" data-rep="patrimonio">Gerar PDF</button></div></section>
      <section class="card"><h2>Levantamento de materiais</h2><p>Mesas, cadeiras, estantes e outros itens, sem os instrumentos.</p>${row("Materiais", db.materiais.length - ins)}<div class="btns" style="margin-top:16px"><button class="btn" data-rep="materiais">Gerar PDF</button></div></section>
      <section class="card"><h2>Levantamento de cadastros</h2><p>Relação dos músicos e alunos com ficha de cadastro.</p>${row("Fichas cadastradas", db.fichas.length)}<div class="btns" style="margin-top:16px"><button class="btn" data-rep="cadastros">Gerar PDF</button></div></section>
      <section class="card"><h2>Itens por estado</h2><p>Instrumentos e materiais</p>${ESTADOS.map(e => row(e, db.materiais.filter(m => m.estado === e).length)).join("")}</section></div>
      <p style="color:var(--muted)">Na janela de impressão, escolha “Salvar como PDF” como destino.</p>`;
  },
  configuracoes(){
    const T = ["Conta", "Aparência"], c = conta(), tema = store.get(TEMA) || "dark";
    const body = tab === 1 ? `<section class="card"><h2>Aparência</h2><p>Escolha o tema do sistema. A escolha fica salva neste navegador.</p><div class="theme">${[["dark", "Escuro"], ["light", "Claro"]].map(([k, n]) => `<button class="btn out" data-tema="${k}" aria-pressed="${tema === k}">${n}</button>`).join("")}</div></section>` : `<section class="card"><h2>Minha conta</h2>
      <div class="who"><b>${NOME}</b><small>Usuário: ${esc(c ? c.usuario : "")}</small><span class="tag ok role">Administrador</span></div>
      <h2 style="font-size:18px;margin-bottom:12px">Alterar senha</h2>
      <form id="pf" class="pform"><label>Senha atual<input name="atual" type="password" autocomplete="current-password" required></label>
      <label>Nova senha<input name="nova" type="password" autocomplete="new-password" minlength="6" required></label>
      <div class="btns"><button class="btn">${I("key")}Salvar nova senha</button><button type="button" class="btn out" onclick="logout()">${I("out")}Sair</button></div></form>
      <p style="margin:16px 0 0">Sua conta fica salva apenas neste navegador. Nenhuma conta Google é usada.</p></section>`;
    return hd("Administração", "Configurações", "Sua conta de acesso e os documentos institucionais da filarmônica.") +
      `<div class="tabs" role="tablist">${T.map((t, k) => `<button role="tab" aria-selected="${k === tab}" data-tab="${k}">${t}</button>`).join("")}</div>` + body;
  }
};

/* ---- Formulários ---- */
const SC = {
  materiais:{t:"material", wide:1, req:["nome","serie"],
    f:() => [["tipo","Tipo","select",TIPOS_M],["nome","Descrição","text",0,"s2"],["marca","Marca","text"],["serie","Nº de série","text"],["estado","Estado de conservação","select",ESTADOS],["localizacao","Localização","loc",0,"s2"],["obs","Observações","text",0,"s2"]],
    check:(d, id) => d.serie && db.materiais.some(m => m.id !== id && (m.serie || "").trim().toLowerCase() === d.serie.trim().toLowerCase()) ? "Já existe um item com esse número de série" : ""},
  termos:{t:"termo de responsabilidade", wide:1, req:["musico","materialId"],
    f:() => [["musico","Músico","musico",0,"s2"],["cpf","CPF","text"],["entrega","Data de entrega","date"],["materialId","Instrumento (nº de série)","mat",0,"s2"],["estadoEntrega","Estado na entrega","select",ESTADOS],["obs","Observações","text",0,"s2"]]},
  devolucao:{t:"devolução", tbl:"termos", titulo:"Registrar devolução do instrumento", wide:1, req:["devolucao"],
    f:() => [["devolucao","Data de devolução","date"],["estadoDevolucao","Estado na devolução","select",ESTADOS],["obsDevolucao","Observações da devolução","text",0,"s2"]]},
  fichas:{t:"ficha de cadastro", novo:"Nova", wide:1, req:["nome"], f:() => [
    ["#","Dados pessoais"],
    ["nome","Nome","text",0,"s2"],["sexo","Sexo","select",["Masculino","Feminino"]],["nascimento","Data de nascimento","date"],
    ["cpf","CPF","text"],["rg","RG","text"],["orgao","Órgão expedidor","text"],["estadoCivil","Estado civil","text"],
    ["pai","Nome do pai","text",0,"s2"],["mae","Nome da mãe","text",0,"s2"],
    ["endereco","Endereço","text",0,"s2"],["numero","Nº","text"],["bairro","Bairro","text"],
    ["cidade","Cidade","text"],["uf","Estado","text"],["cep","CEP","text"],["celular","Celular","tel"],
    ["#","Dados sociais"],
    ["cadastro","Data do cadastro","date"]]}
};
function openForm(tp, id){
  const sc = SC[tp], tb = sc.tbl || tp, item = id ? db[tb].find(x => x.id === id) : {};
  const def = {estado:"Bom", estadoEntrega:"Bom", tipo:"Instrumento", cadastro:hoje(), entrega:hoje(), devolucao:hoje(), estadoDevolucao:"Bom", sexo:"Masculino", localizacao:"Depósito"};
  const livres = db.materiais.filter(m => m.tipo === "Instrumento" && (m.id === item.materialId || (!indisp(m) && !ocupado(m.id))));
  if (tp === "termos" && !livres.length) return toast(db.materiais.some(m => m.tipo === "Instrumento") ? "Nenhum instrumento disponível" : "Cadastre um instrumento em Materiais primeiro");
  const campos = sc.f().map(([k, l, t, o, sp]) => {
    if (k === "#") return `<h3 class="fsec">${l}</h3>`;
    const v = item[k] ?? def[k] ?? "", rq = (sc.req || []).includes(k) ? "required" : "";
    let el;
    if (t === "select") el = `<select name="${k}">${opts(o, v)}</select>`;
    else if (t === "mat") el = `<select name="${k}" ${rq}>${livres.map(m => `<option value="${m.id}" ${m.id === v ? "selected" : ""}>${esc(m.nome)} · Série ${esc(m.serie) || "—"}</option>`).join("")}</select>`;
    else if (t === "loc") el = `<select name="${k}">${locOpts(locais(item.tipo || def.tipo), v)}</select>`;
    else if (t === "musico") el = `<input name="${k}" list="fn" value="${esc(v)}" ${rq}><datalist id="fn">${db.fichas.map(f => `<option value="${esc(f.nome)}">`).join("")}</datalist>`;
    else el = `<input name="${k}" type="${t}" value="${esc(v)}" ${rq}>`;
    return `<label class="${sp || ""}">${l}${el}</label>`;
  }).join("");
  const d = $("#dlg");
  d.className = sc.wide ? "wide" : "";
  d.innerHTML = `<form id="frm"><h2>${sc.titulo || (id ? "Editar" : sc.novo || "Novo") + " " + sc.t}</h2><div class="fgrid">${campos}</div><div class="fa"><button type="button" class="btn out" id="cx">Cancelar</button><button class="btn">Salvar</button></div></form>`;
  if (tp === "materiais") { // localização muda conforme o tipo; "Manutenção" e "Quebrado" ajustam o estado
    const ts = d.querySelector('[name="tipo"]'), ls = d.querySelector('[name="localizacao"]'), es = d.querySelector('[name="estado"]');
    ts.onchange = () => { const l = locais(ts.value); ls.innerHTML = locOpts(l, l.includes(ls.value) ? ls.value : l[0]); };
    ls.onchange = () => { if (ls.value === "Manutenção") es.value = "Em manutenção"; else if (ls.value === "Quebrado") es.value = "Ruim"; };
  }
  $("#cx").onclick = () => d.close();
  $("#frm").onsubmit = e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const err = sc.check && sc.check(data, id);
    if (err) return toast(err);
    if (id) Object.assign(item, data); else db[tb].push({id:uid(), ...data});
    save(); d.close(); render(); toast("Salvo");
  };
  d.showModal();
}

/* ---- Impressão da ficha (modelo da ficha em papel) ---- */
function printFicha(id){
  const f = db.fichas.find(x => x.id === id) || {};
  const v = k => esc(f[k] || ""), dt = k => fd(f[k] || "").replace("—", "");
  const R = (...p) => `<div class="pr">${p.map(x => typeof x === "string" ? `<span>${x}</span>` : `<span class="pi" style="flex:${x[2] || 1}"><b>${x[0]}:</b><i>${x[1]}</i></span>`).join("")}</div>`;
  const X = (k, o) => `( ${f[k] === o ? "X" : "&nbsp;&nbsp;"} ) ${o.toUpperCase()}`;
  $("#print").innerHTML = `<div class="pf fc">
    <div class="fh"><img src="simbolo.jpeg" alt=""><h2>SOCIEDADE FILARMÔNICA EUTERPE JAPARATUBENSE</h2><h2 class="t">FICHA DE CADASTRO</h2></div>
    <div class="fb">
    <h4>DADOS PESSOAIS:</h4>
    ${R(["NOME", v("nome")])}
    ${R(`SEXO: ${X("sexo", "Masculino")} &nbsp; ${X("sexo", "Feminino")}`, ["DATA DE NASCIMENTO", dt("nascimento")])}
    ${R(["CPF", v("cpf")], ["RG", v("rg")], ["ÓRGÃO EXPEDIDOR", v("orgao")])}
    ${R(["ESTADO CIVIL", v("estadoCivil")])}
    ${R(["NOME DO PAI", v("pai")])}
    ${R(["NOME DA MÃE", v("mae")])}
    ${R(["ENDEREÇO", v("endereco"), 4], ["Nº", v("numero")])}
    ${R(["BAIRRO", v("bairro")], ["CIDADE", v("cidade")], ["ESTADO", v("uf"), .5])}
    ${R(["CEP", v("cep")], ["CELULAR", v("celular")])}
    <h4>DADOS SOCIAIS:</h4>
    ${R(["DATA DO CADASTRO", dt("cadastro"), .4])}
    </div>
    <div class="ff"><div class="sig">ASSINATURA DO ALUNO/MÚSICO OU RESPONSÁVEL</div>
    <div class="pfoot">Rua: Jackson Figueiredo, 233 – Centro – Japaratuba (SE) – CEP: 49960-000 – CNPJ.: 13.093.802/0001-35<br>Fone: (79) 99672-2336 – E-mail: filarmonicajaparatubense@gmail.com</div></div></div>`;
  setTimeout(() => window.print(), 100);
}

/* ---- Termo de responsabilidade e levantamentos (PDF) ---- */
const cab = t => `<img src="simbolo.jpeg" alt=""><h2>SOCIEDADE FILARMÔNICA EUTERPE JAPARATUBENSE</h2><h2 class="t">${t}</h2>`;
const rod = `<div class="pfoot">Rua: Jackson Figueiredo, 233 – Centro – Japaratuba (SE) – CEP: 49960-000 – CNPJ.: 13.093.802/0001-35<br>Fone: (79) 99672-2336 – E-mail: filarmonicajaparatubense@gmail.com</div>`;
const PR = (...p) => `<div class="pr">${p.map(x => `<span class="pi" style="flex:${x[2] || 1}"><b>${x[0]}:</b><i>${x[1]}</i></span>`).join("")}</div>`;
const dtv = s => fd(s || "").replace("—", "");
function imprimir(html){ $("#print").innerHTML = html; setTimeout(() => window.print(), 100); }
function printTermo(id){
  const t = db.termos.find(x => x.id === id) || {}, m = mat(t.materialId) || {}, v = s => esc(s || "");
  imprimir(`<div class="pf">${cab("TERMO DE RESPONSABILIDADE")}
    <p class="tx">Eu, <b>${v(t.musico)}</b>, CPF ${v(t.cpf) || "______________"}, declaro ter recebido, em ${dtv(t.entrega) || "___/___/______"}, o instrumento musical descrito abaixo, de propriedade da <b>SOCIEDADE FILARMÔNICA EUTERPE JAPARATUBENSE - S.F.E.J.</b> (MANTENEDORA DA BANDA E ESCOLA DE MÚSICA), inscrita no CNPJ sob o nº 13.093.802/0001-35, pelo prazo de ________ dias, a contar desta data, comprometendo-me a devolvê-lo em perfeito estado ao fim deste prazo, a zelar pelo seu bom uso e conservação e a responder por danos causados por mau uso ou por extravio.</p>
    <h4>DADOS DO INSTRUMENTO:</h4>
    ${PR(["INSTRUMENTO", v(m.nome)])}${PR(["MARCA", v(m.marca)], ["Nº DE SÉRIE", v(m.serie)])}
    ${PR(["ENTREGA", dtv(t.entrega)], ["ESTADO NA ENTREGA", v(t.estadoEntrega)])}${PR(["OBSERVAÇÕES", v(t.obs)])}
    <p class="tx" style="margin-top:14px">O(A) aluno(a) e/ou músico acima qualificado(a) declara ter recebido em perfeitas condições de uso o instrumento solicitado e que foi instruído sobre os cuidados e conservação do mesmo.</p>
    <div class="sig">ASSINATURA DO MÚSICO</div>${rod}</div>`);
}
function printDevolucao(id){
  const t = db.termos.find(x => x.id === id) || {}, m = mat(t.materialId) || {}, v = s => esc(s || "");
  imprimir(`<div class="pf">${cab("TERMO DE DEVOLUÇÃO")}
    <p class="tx">Eu, <b>${v(t.musico)}</b>, CPF ${v(t.cpf) || "______________"}, declaro ter devolvido, em ${dtv(t.devolucao) || "___/___/______"}, à <b>SOCIEDADE FILARMÔNICA EUTERPE JAPARATUBENSE - S.F.E.J.</b> (MANTENEDORA DA BANDA E ESCOLA DE MÚSICA), inscrita no CNPJ sob o nº 13.093.802/0001-35, o instrumento musical descrito abaixo, que me foi entregue em ${dtv(t.entrega) || "___/___/______"} mediante termo de responsabilidade.</p>
    <h4>DADOS DO INSTRUMENTO:</h4>
    ${PR(["INSTRUMENTO", v(m.nome)])}${PR(["MARCA", v(m.marca)], ["Nº DE SÉRIE", v(m.serie)])}
    ${PR(["ENTREGA", dtv(t.entrega)], ["DEVOLUÇÃO", dtv(t.devolucao)])}${PR(["ESTADO NA ENTREGA", v(t.estadoEntrega)], ["ESTADO NA DEVOLUÇÃO", v(t.estadoDevolucao)])}${PR(["OBSERVAÇÕES", v(t.obsDevolucao)])}
    <p class="tx" style="margin-top:14px">A Sociedade Filarmônica Euterpe Japaratubense declara ter recebido de volta o instrumento acima descrito, nas condições aqui registradas.</p>
    <div class="sigs"><div class="sig">ASSINATURA DO MÚSICO</div><div class="sig">RESPONSÁVEL PELA SOCIEDADE</div></div>${rod}</div>`);
}
function printLev(tp){
  const tb = (cols, rows) => `<table><thead><tr><th>Nº</th>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((r, i) => `<tr><td>${i + 1}</td>${r.map(c => `<td>${esc(c) || "—"}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${cols.length + 1}" style="text-align:center">Nenhum item cadastrado</td></tr>`}</tbody></table>`;
  let corpo;
  if (tp === "cadastros") corpo = `<p>Total de fichas: <b>${db.fichas.length}</b></p>` + tb(["Nome","CPF","Nascimento","Celular","Cidade","Cadastro"], db.fichas.map(f => [f.nome, f.cpf, dtv(f.nascimento), f.celular, f.cidade, dtv(f.cadastro)]));
  else if (tp === "materiais") {
    const out = db.materiais.filter(m => m.tipo !== "Instrumento");
    const por = TIPOS_M.filter(t => t !== "Instrumento").map(t => [t, out.filter(m => m.tipo === t).length]).filter(x => x[1]).map(x => `${x[0]}: <b>${x[1]}</b>`).join(" &nbsp; ");
    corpo = `<p>Total de materiais: <b>${out.length}</b>${por ? " &nbsp;|&nbsp; " + por : ""}</p>` + tb(["Tipo","Descrição","Marca","Nº de série","Estado","Localização"], out.map(m => [m.tipo, m.nome, m.marca, m.serie, m.estado, m.localizacao]));
  }
  else {
    const ins = instrs(), out = db.materiais.filter(m => m.tipo !== "Instrumento");
    const sit = m => { const t = emPosse().find(x => x.materialId === m.id); return t ? "Com " + t.musico : m.localizacao === "Quebrado" ? "Quebrado" : indisp(m) ? "Em manutenção" : "Disponível"; };
    corpo = `<p>Instrumentos: <b>${ins.length}</b> &nbsp; Outros materiais: <b>${out.length}</b></p><h4>INSTRUMENTOS</h4>` +
      tb(["Descrição","Marca","Nº de série","Estado","Localização","Situação"], ins.map(m => [m.nome, m.marca, m.serie, m.estado, m.localizacao, sit(m)])) +
      `<h4>MATERIAIS</h4>` + tb(["Tipo","Descrição","Nº de série","Estado","Localização"], out.map(m => [m.tipo, m.nome, m.serie, m.estado, m.localizacao]));
  }
  imprimir(`<div class="pf lev">${cab(tp === "cadastros" ? "LEVANTAMENTO DE CADASTROS" : tp === "materiais" ? "LEVANTAMENTO DE MATERIAIS" : "LEVANTAMENTO DE INSTRUMENTOS E MATERIAIS")}<p class="dt">Emitido em ${fd(hoje())}</p>${corpo}${rod}</div>`);
}

/* ---- Eventos ---- */
document.addEventListener("click", e => {
  const t = e.target.closest("[data-new],[data-edit],[data-del],[data-ret],[data-print],[data-rep],[data-tema],[data-tab],[data-msg]");
  if (!t) return;
  const D = t.dataset;
  if (D.new) openForm(D.new);
  else if (D.edit) openForm(...D.edit.split(":"));
  else if (D.del) {
    const [tp, id] = D.del.split(":");
    if (!confirm("Excluir este registro?")) return;
    db[tp] = db[tp].filter(x => x.id !== id);
    if (tp === "materiais") db.termos = db.termos.filter(x => x.materialId !== id);
    save(); render(); toast("Excluído");
  }
  else if (D.ret) openForm("devolucao", D.ret);
  else if (D.print) { const [tp, id] = D.print.includes(":") ? D.print.split(":") : ["fichas", D.print]; ({termos:printTermo, devolucao:printDevolucao, fichas:printFicha})[tp](id); }
  else if (D.rep) printLev(D.rep);
  else if (D.tema) { aplicaTema(D.tema); render(); }
  else if (D.tab) { tab = +D.tab; render(); }
  else if (D.msg) toast(D.msg);
});
document.addEventListener("input", e => {
  const k = e.target.dataset.f, v = location.hash.slice(1);
  if (!k || !L[v]) return;
  F[k] = e.target.value;
  $("#list").innerHTML = L[v]();
});

let cur = "";
function render(){
  const v = V[location.hash.slice(1)] ? location.hash.slice(1) : "painel";
  if (v !== cur) { F = {q:"", a:"", b:""}; tab = 0; cur = v; }
  $("#view").innerHTML = V[v]();
  document.querySelectorAll("#nav a").forEach(a => a.dataset.v === v ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
}
addEventListener("hashchange", render);
if (conta() && store.get(SK)) start(); else showAuth();