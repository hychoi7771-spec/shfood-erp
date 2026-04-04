import { useState, useEffect } from "react";
import { DB } from "../lib/supabase";
import { C, css } from "../lib/styles";
import { ROLES } from "../lib/config";
import Spinner from "./Spinner";

export default function UsersPage(){
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({id:"",pw:"",name:"",role:"sales",dept:""});
  const [editId,setEditId]=useState(null);

  useEffect(()=>{
    (async()=>{
      try{ const rows=await DB.getUsers(); setUsers(rows); }
      catch{ setUsers([{id:"ceo",pw:"shfood@ceo",name:"대표이사",role:"admin",dept:"경영"},{id:"admin",pw:"shfood2025!",name:"관리자",role:"admin",dept:"경영지원"}]); }
      setLoading(false);
    })();
  },[]);

  const save=async()=>{
    if(!form.id||!form.pw||!form.name) return alert("필수 항목을 입력하세요");
    try{
      if(editId){ await DB.updateUser(editId,form); setUsers(p=>p.map(u=>u.id===editId?form:u)); }
      else{
        if(users.find(u=>u.id===form.id)) return alert("이미 존재하는 아이디입니다");
        await DB.addUser(form); setUsers(p=>[...p,form]);
      }
    }catch{ alert("저장 실패. DB 연결을 확인하세요."); return; }
    setShowForm(false);setEditId(null);setForm({id:"",pw:"",name:"",role:"sales",dept:""});
  };

  const remove=async(id)=>{
    if(id==="admin"||id==="ceo") return alert("CEO·관리자 계정은 삭제할 수 없습니다");
    if(!confirm(`'${users.find(u=>u.id===id)?.name}' 계정을 삭제하시겠습니까?`)) return;
    try{ await DB.deleteUser(id); setUsers(p=>p.filter(u=>u.id!==id)); }
    catch{ alert("삭제 실패"); }
  };

  if(loading) return <Spinner text="계정 불러오는 중..."/>;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:800}}>직원 계정 관리</h2>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:12,color:C.muted}}>총 {users.length}명</span>
          <button style={css.btn(C.green)} onClick={()=>{setShowForm(true);setEditId(null);setForm({id:"",pw:"",name:"",role:"sales",dept:""});}}>+ 신규 직원 추가</button>
        </div>
      </div>
      <div style={{...css.card,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:420}}>
          <thead><tr><th style={css.th}>아이디</th><th style={css.th}>이름</th><th style={css.th}>부서</th><th style={css.th}>권한</th><th style={css.th}>관리</th></tr></thead>
          <tbody>{users.map(u=>(
            <tr key={u.id}>
              <td style={{...css.td,fontWeight:600}}>{u.id}</td>
              <td style={css.td}>{u.name}</td>
              <td style={{...css.td,color:C.muted}}>{u.dept}</td>
              <td style={css.td}><span style={css.badge(ROLES[u.role]?.color||C.muted)}>{ROLES[u.role]?.label||u.role}</span></td>
              <td style={css.td}>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>{setForm({...u});setEditId(u.id);setShowForm(true);}} style={{background:`${C.accent}22`,color:C.accent,border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>수정</button>
                  {(u.id!=="admin"&&u.id!=="ceo")
                    ?<button onClick={()=>remove(u.id)} style={{background:`${C.red}22`,color:C.red,border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>삭제</button>
                    :<span style={{fontSize:10,color:C.muted,padding:"4px 6px"}}>보호됨</span>}
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {showForm&&(
        <div style={{position:"fixed",inset:0,background:"#000a",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:16}}>
          <div style={{...css.card,width:"100%",maxWidth:380}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><h3 style={{margin:0}}>{editId?"직원 수정":"직원 추가"}</h3><button style={css.btn(C.muted,true)} onClick={()=>setShowForm(false)}>✕</button></div>
            <div style={{display:"grid",gap:10}}>
              {[{label:"아이디",field:"id",ph:"로그인 아이디"},{label:"비밀번호",field:"pw",ph:"비밀번호"},{label:"이름",field:"name",ph:"홍길동"},{label:"부서",field:"dept",ph:"영업팀"}].map(({label,field,ph})=>(
                <div key={field}><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>{label}</label><input style={css.input} placeholder={ph} value={form[field]} onChange={e=>setForm(p=>({...p,[field]:e.target.value}))}/></div>
              ))}
              <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>권한</label><select style={{...css.select,width:"100%"}} value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>{Object.entries(ROLES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
              <button style={css.btn(C.muted)} onClick={()=>setShowForm(false)}>취소</button>
              <button style={css.btn(C.green)} onClick={save}>저장 (DB)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
