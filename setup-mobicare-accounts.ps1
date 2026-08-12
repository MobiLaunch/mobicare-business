$ErrorActionPreference="Stop"
$Root=(Get-Location).Path
$Stamp=Get-Date -Format "yyyyMMdd-HHmmss"
$Backup=Join-Path $Root ".mobicare-account-backup-$Stamp"

function Need($p){$x=Join-Path $Root $p;if(!(Test-Path $x)){throw "Missing required file: $p"};$x}
function Backup($p){$x=Join-Path $Root $p;if(Test-Path $x){$d=Join-Path $Backup $p;New-Item (Split-Path $d) -ItemType Directory -Force|Out-Null;Copy-Item $x $d -Force}}
function CreateIfMissing($p,$text){$x=Join-Path $Root $p;if(Test-Path $x){Write-Host "EXISTS  $p" -ForegroundColor DarkGray}else{$d=Split-Path $x;New-Item $d -ItemType Directory -Force|Out-Null;Set-Content $x $text -Encoding UTF8;Write-Host "CREATED $p" -ForegroundColor Green}}
function AppendIfMissing($p,$marker,$text){$x=Need $p;$old=Get-Content $x -Raw;if($old.Contains($marker)){Write-Host "EXISTS  $p" -ForegroundColor DarkGray}else{Add-Content $x "`r`n`r`n$text" -Encoding UTF8;Write-Host "UPDATED $p" -ForegroundColor Green}}

Write-Host "`n=== Mobicare Customer Account Installer ===`n" -ForegroundColor Cyan
Need "package.json"|Out-Null
New-Item $Backup -ItemType Directory -Force|Out-Null
"src/lib/supabase.js","src/App.jsx","src/components/Header.jsx","src/globals.css","src/components/globals.css"|%{Backup $_}
Write-Host "Backup: $Backup" -ForegroundColor Yellow

$globals=if(Test-Path (Join-Path $Root "src/globals.css")){"src/globals.css"}elseif(Test-Path (Join-Path $Root "src/components/globals.css")){"src/components/globals.css"}else{"src/globals.css";New-Item (Join-Path $Root $globals) -ItemType File -Force|Out-Null}

CreateIfMissing "src/lib/AuthContext.jsx" @'
import { createContext, useContext, useEffect, useState } from 'react'
import { getClient } from './supabase'
const AuthContext=createContext(null)
export function AuthProvider({children}){
 const [session,setSession]=useState(null),[user,setUser]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true)
 const load=async(u)=>{if(!u){setProfile(null);return};const sb=getClient();if(!sb)return;const {data}=await sb.from('profiles').select('id,full_name,phone').eq('id',u.id).maybeSingle();setProfile(data||null)}
 useEffect(()=>{const sb=getClient();if(!sb){setLoading(false);return};let alive=true;sb.auth.getSession().then(async({data})=>{if(!alive)return;setSession(data.session);setUser(data.session?.user||null);await load(data.session?.user);if(alive)setLoading(false)});const {data:{subscription}}=sb.auth.onAuthStateChange(async(_,s)=>{if(!alive)return;setSession(s);setUser(s?.user||null);await load(s?.user);setLoading(false)});return()=>{alive=false;subscription.unsubscribe()}},[])
 const signOut=()=>getClient().auth.signOut()
 return <AuthContext.Provider value={{session,user,profile,loading,signOut,refreshProfile:()=>load(user)}}>{children}</AuthContext.Provider>
}
export function useAuth(){const v=useContext(AuthContext);if(!v)throw new Error('useAuth must be used inside AuthProvider');return v}
'@

CreateIfMissing "src/pages/Login.jsx" @'
import {useState} from 'react'
import {Link,useNavigate,useLocation} from 'react-router-dom'
import {getClient} from '../lib/supabase'
import './account-auth.css'
export default function Login(){const nav=useNavigate(),loc=useLocation(),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false)
 const submit=async e=>{e.preventDefault();setError('');setLoading(true);const {error}=await getClient().auth.signInWithPassword({email:email.trim(),password});setLoading(false);if(error)return setError(error.message);nav(loc.state?.from||'/account',{replace:true})}
 return <main className="account-auth-page"><div className="account-auth-card"><h1>Welcome back</h1><p>Sign in to view your repairs and purchases.</p>{error&&<div className="account-auth-error">{error}</div>}<form onSubmit={submit} className="account-auth-form"><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button disabled={loading}>{loading?'Signing in…':'Sign In'}</button></form><Link to="/forgot-password">Forgot password?</Link><p>New customer? <Link to="/signup">Create an account</Link></p></div></main>}
'@

CreateIfMissing "src/pages/Signup.jsx" @'
import {useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {getClient} from '../lib/supabase'
import './account-auth.css'
export default function Signup(){const nav=useNavigate(),[f,setF]=useState({name:'',phone:'',email:'',password:''}),[error,setError]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(false)
 const u=(k,v)=>setF(x=>({...x,[k]:v}))
 const submit=async e=>{e.preventDefault();setError('');setLoading(true);const {data,error}=await getClient().auth.signUp({email:f.email.trim(),password:f.password,options:{emailRedirectTo:`${location.origin}/login`,data:{full_name:f.name.trim(),phone:f.phone.trim()}}});if(error){setLoading(false);return setError(error.message)};if(data.user&&!data.session){setLoading(false);return setMessage('Account created. Check your email to verify your account.')}if(data.user)await getClient().from('profiles').upsert({id:data.user.id,full_name:f.name.trim(),phone:f.phone.trim()});setLoading(false);nav('/account',{replace:true})}
 return <main className="account-auth-page"><div className="account-auth-card"><h1>Create your account</h1><p>Keep your repair appointments and purchases together.</p>{error&&<div className="account-auth-error">{error}</div>}{message&&<div className="account-auth-success">{message}</div>}{!message&&<form onSubmit={submit} className="account-auth-form"><label>Full name<input value={f.name} onChange={e=>u('name',e.target.value)} required/></label><label>Phone<input value={f.phone} onChange={e=>u('phone',e.target.value)} required/></label><label>Email<input type="email" value={f.email} onChange={e=>u('email',e.target.value)} required/></label><label>Password<input type="password" value={f.password} onChange={e=>u('password',e.target.value)} minLength="8" required/></label><button disabled={loading}>{loading?'Creating…':'Create Account'}</button></form>}<p>Already have an account? <Link to="/login">Sign in</Link></p></div></main>}
'@

CreateIfMissing "src/pages/ForgotPassword.jsx" @'
import {useState} from 'react'
import {Link} from 'react-router-dom'
import {getClient} from '../lib/supabase'
import './account-auth.css'
export default function ForgotPassword(){const[email,setEmail]=useState(''),[msg,setMsg]=useState(''),[err,setErr]=useState(''),[loading,setLoading]=useState(false)
 const submit=async e=>{e.preventDefault();setErr('');setLoading(true);const {error}=await getClient().auth.resetPasswordForEmail(email.trim(),{redirectTo:`${location.origin}/reset-password`});setLoading(false);if(error)return setErr(error.message);setMsg('If an account exists for that email, a reset link has been sent.')}
 return <main className="account-auth-page"><div className="account-auth-card"><h1>Reset your password</h1>{err&&<div className="account-auth-error">{err}</div>}{msg&&<div className="account-auth-success">{msg}</div>}<form onSubmit={submit} className="account-auth-form"><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><button disabled={loading}>{loading?'Sending…':'Send Reset Link'}</button></form><Link to="/login">Back to sign in</Link></div></main>}
'@

CreateIfMissing "src/pages/ResetPassword.jsx" @'
import {useEffect,useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {getClient} from '../lib/supabase'
import './account-auth.css'
export default function ResetPassword(){const nav=useNavigate(),[ready,setReady]=useState(false),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('')
 useEffect(()=>{const sb=getClient();sb.auth.getSession().then(({data})=>{if(data.session)setReady(true)});const {data:{subscription}}=sb.auth.onAuthStateChange((e,s)=>{if(e==='PASSWORD_RECOVERY'&&s)setReady(true)});return()=>subscription.unsubscribe()},[])
 const submit=async e=>{e.preventDefault();setError('');if(password.length<8)return setError('Password must be at least 8 characters.');if(password!==confirm)return setError('Passwords do not match.');const {error}=await getClient().auth.updateUser({password});if(error)return setError(error.message);setMessage('Password updated.');setTimeout(()=>nav('/account',{replace:true}),700)}
 return <main className="account-auth-page"><div className="account-auth-card"><h1>Choose a new password</h1>{!ready&&!message&&<p>Open the reset link from your email to continue.</p>}{error&&<div className="account-auth-error">{error}</div>}{message&&<div className="account-auth-success">{message}</div>}{ready&&!message&&<form onSubmit={submit} className="account-auth-form"><label>New password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength="8" required/></label><label>Confirm password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength="8" required/></label><button>Update Password</button></form>}<Link to="/login">Back to sign in</Link></div></main>}
'@

CreateIfMissing "src/pages/Account.jsx" @'
import {useEffect,useState} from 'react'
import {useNavigate,Link} from 'react-router-dom'
import {useAuth} from '../lib/AuthContext'
import {getClient} from '../lib/supabase'
import './account-auth.css'
export default function Account(){const nav=useNavigate(),{user,profile,loading,signOut,refreshProfile}=useAuth(),[bookings,setBookings]=useState([]),[orders,setOrders]=useState([]),[name,setName]=useState(''),[phone,setPhone]=useState(''),[busy,setBusy]=useState(true),[error,setError]=useState(''),[saved,setSaved]=useState(false)
 useEffect(()=>{if(!loading&&!user)nav('/login',{replace:true})},[loading,user,nav])
 useEffect(()=>{if(profile){setName(profile.full_name||'');setPhone(profile.phone||'')}},[profile])
 useEffect(()=>{if(!user)return;const load=async()=>{const sb=getClient();const[a,o]=await Promise.all([sb.from('bookings').select('*').eq('user_id',user.id).order('created_at',{ascending:false}),sb.from('orders').select('*').eq('user_id',user.id).order('created_at',{ascending:false})]);if(a.error||o.error)setError(a.error?.message||o.error?.message||'Unable to load account history.');setBookings(a.data||[]);setOrders(o.data||[]);setBusy(false)};load()},[user])
 const save=async e=>{e.preventDefault();setSaved(false);const{error}=await getClient().from('profiles').upsert({id:user.id,full_name:name.trim(),phone:phone.trim()});if(error)return setError(error.message);await refreshProfile();setSaved(true)}
 if(loading)return <main className="account-auth-page"><div className="account-auth-card">Loading account…</div></main>
 return <main className="account-page"><div className="account-container"><div className="account-heading"><div><p>Mobicare</p><h1>My Account</h1><p>Welcome back{profile?.full_name?`, ${profile.full_name.split(' ')[0]}`:''}.</p></div><button onClick={async()=>{await signOut();nav('/login',{replace:true})}}>Sign Out</button></div>{error&&<div className="account-auth-error">{error}</div>}{saved&&<div className="account-auth-success">Profile saved.</div>}<section className="account-card"><h2>Profile</h2><form onSubmit={save} className="account-profile-form"><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Phone<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>Email<input value={user?.email||''} disabled/></label><button>Save Profile</button></form></section><section className="account-card"><div className="account-section-heading"><h2>Repair Appointments</h2><Link to="/book">Book a Repair</Link></div>{busy?'Loading…':bookings.length===0?'No repair appointments yet.':bookings.map(b=><article className="account-history-item" key={b.id}><div><strong>{b.service||'Repair'}</strong><span>{b.device_type} {b.device_model}</span><span>{b.appt_date} at {b.appt_time}</span></div><span>{b.status||'pending'}</span></article>)}</section><section className="account-card"><div className="account-section-heading"><h2>Purchase History</h2><Link to="/shop">Shop</Link></div>{busy?'Loading…':orders.length===0?'No purchases yet.':orders.map(o=><article className="account-history-item" key={o.id}><div><strong>Order #{String(o.id).slice(0,8)}</strong><span>{o.created_at?new Date(o.created_at).toLocaleDateString():''}</span><span>{o.status||'paid'}</span></div><strong>${Number(o.total||0).toFixed(2)}</strong></article>)}</section></div></main>}
'@

AppendIfMissing "src/lib/supabase.js" "/* Mobicare customer account helpers */" @'
/* Mobicare customer account helpers */
export function getClient() {
  return supabase
}
'@

# CSS append
AppendIfMissing $globals "/* Mobicare customer account styling */" @'
/* Mobicare customer account styling */
.account-auth-page{min-height:70vh;display:grid;place-items:center;padding:48px 20px}.account-auth-card,.account-card{background:var(--card,#fff);border:1px solid rgba(0,0,0,.08);border-radius:18px;box-shadow:0 12px 32px rgba(0,0,0,.08)}.account-auth-card{width:min(100%,460px);padding:32px}.account-auth-form,.account-profile-form{display:grid;gap:16px;margin:24px 0}.account-auth-form label,.account-profile-form label{display:grid;gap:7px;font-weight:600}.account-auth-form input,.account-profile-form input{box-sizing:border-box;width:100%;padding:12px 14px;border:1px solid rgba(0,0,0,.16);border-radius:10px;background:var(--input-bg,#fff);color:inherit}.account-auth-form button,.account-profile-form button,.account-secondary-button{border:0;border-radius:10px;padding:12px 16px;cursor:pointer;font-weight:700}.account-auth-error,.account-auth-success{padding:12px 14px;border-radius:10px;margin:16px 0}.account-auth-error{background:#fee4e2;color:#b42318}.account-auth-success{background:#dcfae6;color:#067647}.account-page{padding:40px 20px 80px}.account-container{width:min(100%,1000px);margin:auto;display:grid;gap:24px}.account-heading,.account-section-heading,.account-history-item{display:flex;align-items:center;justify-content:space-between;gap:20px}.account-card{padding:24px}.account-history-list{display:grid;gap:10px}.account-history-item{padding:15px;border:1px solid rgba(0,0,0,.08);border-radius:12px}.account-history-item div{display:grid;gap:4px}.account-history-item span{opacity:.7}
'@

# App imports/routes/provider: conservative, idempotent
$app=Need "src/App.jsx";$a=Get-Content $app -Raw
if(!$a.Contains("import { AuthProvider } from './lib/AuthContext'")){$a="import { AuthProvider } from './lib/AuthContext'`r`n"+$a}
$imports=@("import Login from './pages/Login'","import Signup from './pages/Signup'","import ForgotPassword from './pages/ForgotPassword'","import ResetPassword from './pages/ResetPassword'","import Account from './pages/Account'")
foreach($i in $imports){if(!$a.Contains($i)){$a=$i+"`r`n"+$a}}
if(!$a.Contains('path="/account"') -and $a.Contains('<Routes>')){$r='<Route path="/login" element={<Login />} />`r`n      <Route path="/signup" element={<Signup />} />`r`n      <Route path="/forgot-password" element={<ForgotPassword />} />`r`n      <Route path="/reset-password" element={<ResetPassword />} />`r`n      <Route path="/account" element={<Account />} />';$a=$a.Replace('<Routes>',"<Routes>`r`n      $r")}
if(!$a.Contains('<AuthProvider>')){if($a.Contains('<BrowserRouter>')){$a=$a.Replace('<BrowserRouter>','<BrowserRouter>`r`n      <AuthProvider>');$i=$a.LastIndexOf('</BrowserRouter>');if($i-ge 0){$a=$a.Insert($i,"      </AuthProvider>`r`n      ")}}elseif($a.Contains('<Router>')){$a=$a.Replace('<Router>','<Router>`r`n      <AuthProvider>');$i=$a.LastIndexOf('</Router>');if($i-ge 0){$a=$a.Insert($i,"      </AuthProvider>`r`n      ")}}}
Set-Content $app $a -Encoding UTF8

# Phase 2 server endpoints
CreateIfMissing "api/create-booking.js" @'
import {createClient} from '@supabase/supabase-js'
async function user(req){const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return null;const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const{data}=await sb.auth.getUser(h.slice(7));return data?.user||null}
export default async function handler(req,res){if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});try{const b=typeof req.body==='string'?JSON.parse(req.body):req.body,u=await user(req);const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const required=['service','deviceType','deviceModel','date','time','name','phone','email'];if(!b||!required.every(k=>typeof b[k]==='string'&&b[k].trim()))return res.status(400).json({error:'Please provide all required booking information.'});const{error}=await sb.from('bookings').insert({user_id:u?.id||null,service:b.service.trim(),device_type:b.deviceType.trim(),device_model:b.deviceModel.trim(),issue:b.issue?.trim()||'',appt_date:b.date.trim(),appt_time:b.time.trim(),customer_name:b.name.trim(),customer_phone:b.phone.trim(),customer_email:b.email.trim().toLowerCase(),notes:b.notes?.trim()||'',status:'pending'});if(error)throw error;return res.status(201).json({ok:true,linkedToAccount:!!u})}catch(e){console.error(e.message);return res.status(500).json({error:'Unable to submit booking.'})}}
'@

CreateIfMissing "api/create-checkout-session.js" @'
import Stripe from 'stripe'
import {createClient} from '@supabase/supabase-js'
async function user(req){const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return null;const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const{data}=await sb.auth.getUser(h.slice(7));return data?.user||null}
export default async function handler(req,res){if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});try{const b=typeof req.body==='string'?JSON.parse(req.body):req.body,u=await user(req);const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const items=Array.isArray(b?.items)?b.items:[];if(!items.length)return res.status(400).json({error:'Your cart is empty.'});const ids=[...new Set(items.map(x=>String(x.id)))];const{data:products,error}=await sb.from('products').select('id,name,price,stock,active').in('id',ids);if(error)throw error;const map=new Map((products||[]).map(p=>[String(p.id),p]));const trusted=items.map(x=>{const p=map.get(String(x.id)),q=Number(x.qty);if(!p||p.active===false||!Number.isInteger(q)||q<1||q>99||p.stock<q)throw new Error('Item unavailable');return{p,q}});const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);const origin=new URL(process.env.PUBLIC_SITE_URL||req.headers.origin||'http://localhost:5173').origin;const session=await stripe.checkout.sessions.create({mode:'payment',line_items:trusted.map(({p,q})=>({price_data:{currency:'usd',product_data:{name:p.name,metadata:{kind:'product',product_id:String(p.id)}},unit_amount:Math.round(Number(p.price)*100)},quantity:q})),customer_email:b.shipping?.email||u?.email,shipping_address_collection:{allowed_countries:['US']},metadata:{user_id:u?.id||''},success_url:`${origin}/order-success`,cancel_url:`${origin}/cart`});return res.json({url:session.url})}catch(e){if(e.message==='Item unavailable')return res.status(409).json({error:'One or more items are unavailable.'});console.error(e.message);return res.status(500).json({error:'Unable to start checkout.'})}}
'@

CreateIfMissing "supabase-phase2-safety.sql" @'
create index if not exists bookings_user_id_created_at_idx on public.bookings(user_id,created_at desc);
create index if not exists orders_user_id_created_at_idx on public.orders(user_id,created_at desc);
alter table public.bookings enable row level security;
alter table public.orders enable row level security;
alter table public.profiles enable row level security;
drop policy if exists "Customers can view own bookings" on public.bookings;
create policy "Customers can view own bookings" on public.bookings for select to authenticated using(user_id=auth.uid());
drop policy if exists "Customers can view own orders" on public.orders;
create policy "Customers can view own orders" on public.orders for select to authenticated using(user_id=auth.uid());
drop policy if exists "Customers can view own profile" on public.profiles;
create policy "Customers can view own profile" on public.profiles for select to authenticated using(id=auth.uid());
drop policy if exists "Customers can update own profile" on public.profiles;
create policy "Customers can update own profile" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
'@

Write-Host "`nDONE." -ForegroundColor Green
Write-Host "Backup: $Backup"
Write-Host "Run supabase-phase2-safety.sql in Supabase SQL Editor."
Write-Host "Then run: npm run build"
Write-Host "Review git diff before committing."
Write-Host "Do not put SUPABASE_SERVICE_ROLE_KEY or STRIPE_SECRET_KEY in frontend code." -ForegroundColor Yellow
