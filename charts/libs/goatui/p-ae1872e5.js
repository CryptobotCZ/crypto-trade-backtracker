const t="goatui";let e;let n;let s=false;let o=false;const l=t=>{const e=new URL(t,Ct.t);return e.origin!==kt.location.origin?e.href:e.pathname};const c=(t,e="")=>{{return()=>{}}};const i=(t,e)=>{{return()=>{}}};const f="{visibility:hidden}.hydrated{visibility:inherit}";const r="http://www.w3.org/1999/xlink";const u={};const a="http://www.w3.org/2000/svg";const d="http://www.w3.org/1999/xhtml";const h=t=>t!=null;const p=t=>{t=typeof t;return t==="object"||t==="function"};function y(t){var e,n,s;return(s=(n=(e=t.head)===null||e===void 0?void 0:e.querySelector('meta[name="csp-nonce"]'))===null||n===void 0?void 0:n.getAttribute("content"))!==null&&s!==void 0?s:undefined}const m=(t,e,...n)=>{let s=null;let o=null;let l=false;let c=false;const i=[];const f=e=>{for(let n=0;n<e.length;n++){s=e[n];if(Array.isArray(s)){f(s)}else if(s!=null&&typeof s!=="boolean"){if(l=typeof t!=="function"&&!p(s)){s=String(s)}if(l&&c){i[i.length-1].o+=s}else{i.push(l?w(null,s):s)}c=l}}};f(n);if(e){if(e.key){o=e.key}{const t=e.className||e.class;if(t){e.class=typeof t!=="object"?t:Object.keys(t).filter((e=>t[e])).join(" ")}}}if(typeof t==="function"){return t(e===null?{}:e,i,g)}const r=w(t,null);r.l=e;if(i.length>0){r.i=i}{r.u=o}return r};const w=(t,e)=>{const n={h:0,p:t,o:e,m:null,i:null};{n.l=null}{n.u=null}return n};const b={};const $=t=>t&&t.p===b;const g={forEach:(t,e)=>t.map(v).forEach(e),map:(t,e)=>t.map(v).map(e).map(S)};const v=t=>({vattrs:t.l,vchildren:t.i,vkey:t.u,vname:t.$,vtag:t.p,vtext:t.o});const S=t=>{if(typeof t.vtag==="function"){const e=Object.assign({},t.vattrs);if(t.vkey){e.key=t.vkey}if(t.vname){e.name=t.vname}return m(t.vtag,e,...t.vchildren||[])}const e=w(t.vtag,t.vtext);e.l=t.vattrs;e.i=t.vchildren;e.u=t.vkey;e.$=t.vname;return e};const j=(t,e)=>{if(t!=null&&!p(t)){if(e&4){return t==="false"?false:t===""||!!t}if(e&2){return parseFloat(t)}if(e&1){return String(t)}return t}return t};const k=t=>mt(t).g;const O=(t,e,n)=>{const s=k(t);return{emit:t=>C(s,e,{bubbles:!!(n&4),composed:!!(n&2),cancelable:!!(n&1),detail:t})}};const C=(t,e,n)=>{const s=Ct.ce(e,n);t.dispatchEvent(s);return s};const M=new WeakMap;const x=(t,e,n)=>{let s=jt.get(t);if(xt&&n){s=s||new CSSStyleSheet;if(typeof s==="string"){s=e}else{s.replaceSync(e)}}else{s=e}jt.set(t,s)};const P=(t,e,n)=>{var s;const o=U(e);const l=jt.get(o);t=t.nodeType===11?t:Ot;if(l){if(typeof l==="string"){t=t.head||t;let e=M.get(t);let n;if(!e){M.set(t,e=new Set)}if(!e.has(o)){{n=Ot.createElement("style");n.innerHTML=l;const e=(s=Ct.v)!==null&&s!==void 0?s:y(Ot);if(e!=null){n.setAttribute("nonce",e)}t.insertBefore(n,t.querySelector("link"))}if(e){e.add(o)}}}else if(!t.adoptedStyleSheets.includes(l)){t.adoptedStyleSheets=[...t.adoptedStyleSheets,l]}}return o};const L=t=>{const e=t.S;const n=t.g;const s=e.h;const o=c("attachStyles",e.j);const l=P(n.shadowRoot?n.shadowRoot:n.getRootNode(),e);if(s&10){n["s-sc"]=l;n.classList.add(l+"-h")}o()};const U=(t,e)=>"sc-"+t.j;const E=(t,e,n,s,o,l)=>{if(n!==s){let c=$t(t,e);let i=e.toLowerCase();if(e==="class"){const e=t.classList;const o=W(n);const l=W(s);e.remove(...o.filter((t=>t&&!l.includes(t))));e.add(...l.filter((t=>t&&!o.includes(t))))}else if(e==="style"){{for(const e in n){if(!s||s[e]==null){if(e.includes("-")){t.style.removeProperty(e)}else{t.style[e]=""}}}}for(const e in s){if(!n||s[e]!==n[e]){if(e.includes("-")){t.style.setProperty(e,s[e])}else{t.style[e]=s[e]}}}}else if(e==="key");else if(e==="ref"){if(s){s(t)}}else if(!c&&e[0]==="o"&&e[1]==="n"){if(e[2]==="-"){e=e.slice(3)}else if($t(kt,i)){e=i.slice(2)}else{e=i[2]+e.slice(3)}if(n){Ct.rel(t,e,n,false)}if(s){Ct.ael(t,e,s,false)}}else{const f=p(s);if((c||f&&s!==null)&&!o){try{if(!t.tagName.includes("-")){const o=s==null?"":s;if(e==="list"){c=false}else if(n==null||t[e]!=o){t[e]=o}}else{t[e]=s}}catch(t){}}let u=false;{if(i!==(i=i.replace(/^xlink\:?/,""))){e=i;u=true}}if(s==null||s===false){if(s!==false||t.getAttribute(e)===""){if(u){t.removeAttributeNS(r,e)}else{t.removeAttribute(e)}}}else if((!c||l&4||o)&&!f){s=s===true?"":s;if(u){t.setAttributeNS(r,e,s)}else{t.setAttribute(e,s)}}}}};const R=/\s/;const W=t=>!t?[]:t.split(R);const F=(t,e,n,s)=>{const o=e.m.nodeType===11&&e.m.host?e.m.host:e.m;const l=t&&t.l||u;const c=e.l||u;{for(s in l){if(!(s in c)){E(o,s,l[s],undefined,n,e.h)}}}for(s in c){E(o,s,l[s],c[s],n,e.h)}};const N=(t,n,o,l)=>{const c=n.i[o];let i=0;let f;let r;if(c.o!==null){f=c.m=Ot.createTextNode(c.o)}else{if(!s){s=c.p==="svg"}f=c.m=Ot.createElementNS(s?a:d,c.p);if(s&&c.p==="foreignObject"){s=false}{F(null,c,s)}if(h(e)&&f["s-si"]!==e){f.classList.add(f["s-si"]=e)}if(c.i){for(i=0;i<c.i.length;++i){r=N(t,c,i);if(r){f.appendChild(r)}}}{if(c.p==="svg"){s=false}else if(f.tagName==="foreignObject"){s=true}}}return f};const T=(t,e,s,o,l,c)=>{let i=t;let f;if(i.shadowRoot&&i.tagName===n){i=i.shadowRoot}for(;l<=c;++l){if(o[l]){f=N(null,s,l);if(f){o[l].m=f;i.insertBefore(f,e)}}}};const A=(t,e,n)=>{for(let s=e;s<=n;++s){const e=t[s];if(e){const t=e.m;I(e);if(t){t.remove()}}}};const H=(t,e,n,s)=>{let o=0;let l=0;let c=0;let i=0;let f=e.length-1;let r=e[0];let u=e[f];let a=s.length-1;let d=s[0];let h=s[a];let p;let y;while(o<=f&&l<=a){if(r==null){r=e[++o]}else if(u==null){u=e[--f]}else if(d==null){d=s[++l]}else if(h==null){h=s[--a]}else if(q(r,d)){D(r,d);r=e[++o];d=s[++l]}else if(q(u,h)){D(u,h);u=e[--f];h=s[--a]}else if(q(r,h)){D(r,h);t.insertBefore(r.m,u.m.nextSibling);r=e[++o];h=s[--a]}else if(q(u,d)){D(u,d);t.insertBefore(u.m,r.m);u=e[--f];d=s[++l]}else{c=-1;{for(i=o;i<=f;++i){if(e[i]&&e[i].u!==null&&e[i].u===d.u){c=i;break}}}if(c>=0){y=e[c];if(y.p!==d.p){p=N(e&&e[l],n,c)}else{D(y,d);e[c]=undefined;p=y.m}d=s[++l]}else{p=N(e&&e[l],n,l);d=s[++l]}if(p){{r.m.parentNode.insertBefore(p,r.m)}}}}if(o>f){T(t,s[a+1]==null?null:s[a+1].m,n,s,l,a)}else if(l>a){A(e,o,f)}};const q=(t,e)=>{if(t.p===e.p){{return t.u===e.u}}return false};const D=(t,e)=>{const n=e.m=t.m;const o=t.i;const l=e.i;const c=e.p;const i=e.o;if(i===null){{s=c==="svg"?true:c==="foreignObject"?false:s}{if(c==="slot");else{F(t,e,s)}}if(o!==null&&l!==null){H(n,o,e,l)}else if(l!==null){if(t.o!==null){n.textContent=""}T(n,null,e,l,0,l.length-1)}else if(o!==null){A(o,0,o.length-1)}if(s&&c==="svg"){s=false}}else if(t.o!==i){n.data=i}};const I=t=>{{t.l&&t.l.ref&&t.l.ref(null);t.i&&t.i.map(I)}};const V=(t,s)=>{const o=t.g;const l=t.S;const c=t.k||w(null,null);const i=$(s)?s:m(null,null,s);n=o.tagName;if(l.O){i.l=i.l||{};l.O.map((([t,e])=>i.l[e]=o[t]))}i.p=null;i.h|=4;t.k=i;i.m=c.m=o.shadowRoot||o;{e=o["s-sc"]}D(c,i)};const _=(t,e)=>{if(e&&!t.C&&e["s-p"]){e["s-p"].push(new Promise((e=>t.C=e)))}};const z=(t,e)=>{{t.h|=16}if(t.h&4){t.h|=512;return}_(t,t.M);const n=()=>B(t,e);return Ft(n)};const B=(t,e)=>{const n=c("scheduleUpdate",t.S.j);const s=t.P;let o;if(e){{t.h|=256;if(t.L){t.L.map((([t,e])=>Z(s,t,e)));t.L=undefined}}{o=Z(s,"componentWillLoad")}}{o=G(o,(()=>Z(s,"componentWillRender")))}n();return G(o,(()=>K(t,s,e)))};const G=(t,e)=>J(t)?t.then(e):e();const J=t=>t instanceof Promise||t&&t.then&&typeof t.then==="function";const K=async(t,e,n)=>{var s;const o=t.g;const l=c("update",t.S.j);const i=o["s-rc"];if(n){L(t)}const f=c("render",t.S.j);{Q(t,e)}if(i){i.map((t=>t()));o["s-rc"]=undefined}f();l();{const e=(s=o["s-p"])!==null&&s!==void 0?s:[];const n=()=>X(t);if(e.length===0){n()}else{Promise.all(e).then(n);t.h|=4;e.length=0}}};const Q=(t,e,n)=>{try{e=e.render&&e.render();{t.h&=~16}{t.h|=2}{{{V(t,e)}}}}catch(e){gt(e,t.g)}return null};const X=t=>{const e=t.S.j;const n=t.g;const s=c("postUpdate",e);const o=t.P;const l=t.M;if(!(t.h&64)){t.h|=64;{tt(n)}{Z(o,"componentDidLoad")}s();{t.U(n);if(!l){Y()}}}else{s()}{t.R(n)}{if(t.C){t.C();t.C=undefined}if(t.h&512){Wt((()=>z(t,false)))}t.h&=~(4|512)}};const Y=e=>{{tt(Ot.documentElement)}Wt((()=>C(kt,"appload",{detail:{namespace:t}})))};const Z=(t,e,n)=>{if(t&&t[e]){try{return t[e](n)}catch(t){gt(t)}}return undefined};const tt=t=>t.classList.add("hydrated");const et=(t,e)=>mt(t).W.get(e);const nt=(t,e,n,s)=>{const o=mt(t);const l=o.g;const c=o.W.get(e);const i=o.h;const f=o.P;n=j(n,s.F[e][0]);const r=Number.isNaN(c)&&Number.isNaN(n);const u=n!==c&&!r;if((!(i&8)||c===undefined)&&u){o.W.set(e,n);if(f){if(s.N&&i&128){const t=s.N[e];if(t){t.map((t=>{try{f[t](n,c,e)}catch(t){gt(t,l)}}))}}if((i&(2|16))===2){if(f.componentShouldUpdate){if(f.componentShouldUpdate(n,c,e)===false){return}}z(o,false)}}}};const st=(t,e,n)=>{if(e.F){if(t.watchers){e.N=t.watchers}const s=Object.entries(e.F);const o=t.prototype;s.map((([t,[s]])=>{if(s&31||n&2&&s&32){Object.defineProperty(o,t,{get(){return et(this,t)},set(n){nt(this,t,n,e)},configurable:true,enumerable:true})}else if(n&1&&s&64){Object.defineProperty(o,t,{value(...e){const n=mt(this);return n.T.then((()=>n.P[t](...e)))}})}}));if(n&1){const n=new Map;o.attributeChangedCallback=function(t,e,s){Ct.jmp((()=>{const e=n.get(t);if(this.hasOwnProperty(e)){s=this[e];delete this[e]}else if(o.hasOwnProperty(e)&&typeof this[e]==="number"&&this[e]==s){return}this[e]=s===null&&typeof this[e]==="boolean"?false:s}))};t.observedAttributes=s.filter((([t,e])=>e[0]&15)).map((([t,s])=>{const o=s[1]||t;n.set(o,t);if(s[0]&512){e.O.push([t,o])}return o}))}}return t};const ot=async(t,e,n,s,o)=>{if((e.h&32)===0){e.h|=32;{o=St(n);if(o.then){const t=i();o=await o;t()}if(!o.isProxied){{n.N=o.watchers}st(o,n,2);o.isProxied=true}const t=c("createInstance",n.j);{e.h|=8}try{new o(e)}catch(t){gt(t)}{e.h&=~8}{e.h|=128}t();lt(e.P)}if(o.style){let t=o.style;const e=U(n);if(!jt.has(e)){const s=c("registerStyles",n.j);x(e,t,!!(n.h&1));s()}}}const l=e.M;const f=()=>z(e,true);if(l&&l["s-rc"]){l["s-rc"].push(f)}else{f()}};const lt=t=>{{Z(t,"connectedCallback")}};const ct=t=>{if((Ct.h&1)===0){const e=mt(t);const n=e.S;const s=c("connectedCallback",n.j);if(!(e.h&1)){e.h|=1;{let n=t;while(n=n.parentNode||n.host){if(n["s-p"]){_(e,e.M=n);break}}}if(n.F){Object.entries(n.F).map((([e,[n]])=>{if(n&31&&t.hasOwnProperty(e)){const n=t[e];delete t[e];t[e]=n}}))}{ot(t,e,n)}}else{ut(t,e,n.A);lt(e.P)}s()}};const it=t=>{if((Ct.h&1)===0){const e=mt(t);{if(e.H){e.H.map((t=>t()));e.H=undefined}}}};const ft=(t,e={})=>{var n;const s=c();const o=[];const l=e.exclude||[];const i=kt.customElements;const r=Ot.head;const u=r.querySelector("meta[charset]");const a=Ot.createElement("style");const d=[];let h;let p=true;Object.assign(Ct,e);Ct.t=new URL(e.resourcesUrl||"./",Ot.baseURI).href;t.map((t=>{t[1].map((e=>{const n={h:e[0],j:e[1],F:e[2],A:e[3]};{n.F=e[2]}{n.A=e[3]}{n.O=[]}{n.N={}}const s=n.j;const c=class extends HTMLElement{constructor(t){super(t);t=this;bt(t,n);if(n.h&1){{{t.attachShadow({mode:"open"})}}}}connectedCallback(){if(h){clearTimeout(h);h=null}if(p){d.push(this)}else{Ct.jmp((()=>ct(this)))}}disconnectedCallback(){Ct.jmp((()=>it(this)))}componentOnReady(){return mt(this).q}};n.D=t[0];if(!l.includes(s)&&!i.get(s)){o.push(s);i.define(s,st(c,n,1))}}))}));{a.innerHTML=o+f;a.setAttribute("data-styles","");const t=(n=Ct.v)!==null&&n!==void 0?n:y(Ot);if(t!=null){a.setAttribute("nonce",t)}r.insertBefore(a,u?u.nextSibling:r.firstChild)}p=false;if(d.length){d.map((t=>t.connectedCallback()))}else{{Ct.jmp((()=>h=setTimeout(Y,30)))}}s()};const rt=(t,e)=>e;const ut=(t,e,n,s)=>{if(n){n.map((([n,s,o])=>{const l=dt(t,n);const c=at(e,o);const i=ht(n);Ct.ael(l,s,c,i);(e.H=e.H||[]).push((()=>Ct.rel(l,s,c,i)))}))}};const at=(t,e)=>n=>{try{{if(t.h&256){t.P[e](n)}else{(t.L=t.L||[]).push([e,n])}}}catch(t){gt(t)}};const dt=(t,e)=>{if(e&8)return kt;return t};const ht=t=>(t&2)!==0;const pt=t=>Ct.v=t;const yt=new WeakMap;const mt=t=>yt.get(t);const wt=(t,e)=>yt.set(e.P=t,e);const bt=(t,e)=>{const n={h:0,g:t,S:e,W:new Map};{n.T=new Promise((t=>n.R=t))}{n.q=new Promise((t=>n.U=t));t["s-p"]=[];t["s-rc"]=[]}ut(t,n,e.A);return yt.set(t,n)};const $t=(t,e)=>e in t;const gt=(t,e)=>(0,console.error)(t,e);const vt=new Map;const St=(t,e,n)=>{const s=t.j.replace(/-/g,"_");const o=t.D;const l=vt.get(o);if(l){return l[s]}
/*!__STENCIL_STATIC_IMPORT_SWITCH__*/return import(`./${o}.entry.js${""}`).then((t=>{{vt.set(o,t)}return t[s]}),gt)};const jt=new Map;const kt=typeof window!=="undefined"?window:{};const Ot=kt.document||{head:{}};const Ct={h:0,t:"",jmp:t=>t(),raf:t=>requestAnimationFrame(t),ael:(t,e,n,s)=>t.addEventListener(e,n,s),rel:(t,e,n,s)=>t.removeEventListener(e,n,s),ce:(t,e)=>new CustomEvent(t,e)};const Mt=t=>Promise.resolve(t);const xt=(()=>{try{new CSSStyleSheet;return typeof(new CSSStyleSheet).replaceSync==="function"}catch(t){}return false})();const Pt=[];const Lt=[];const Ut=(t,e)=>n=>{t.push(n);if(!o){o=true;if(e&&Ct.h&4){Wt(Rt)}else{Ct.raf(Rt)}}};const Et=t=>{for(let e=0;e<t.length;e++){try{t[e](performance.now())}catch(t){gt(t)}}t.length=0};const Rt=()=>{Et(Pt);{Et(Lt);if(o=Pt.length>0){Ct.raf(Rt)}}};const Wt=t=>Mt().then(t);const Ft=Ut(Lt,true);export{rt as F,b as H,l as a,ft as b,O as c,k as g,m as h,Mt as p,wt as r,pt as s};
//# sourceMappingURL=p-ae1872e5.js.map