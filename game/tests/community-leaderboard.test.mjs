import test from "node:test";
import assert from "node:assert/strict";
import { CommunityStore, communitySnapshot, communityResponse, COMMUNITY_COURSE } from "../leaderboard/CommunityStore.js";
import { CommunityLeaderboard } from "../ui/CommunityLeaderboard.js";
import { levels } from "../levels/levels.js";

function fixture() {
    let account="account-a", joined=false, failSync=false, release;
    const calls=[], local=new Map([[1,{completed:true,coinIds:[levels[0].coins[0].id],time:123450}]]);
    const progress={userId:account,getLevel:id=>local.get(id)??{completed:false,coinIds:[]},getBestTime:id=>local.get(id)?.time??null};
    const row={rank:1,username:"Test adventurer",completed:1,coins:1,time_ms:123450,is_you:true};
    const client={auth:{getSession:async()=>({data:{session:account?{user:{id:account}}:null}})},rpc:async(name,args)=>{
        calls.push({name,args});
        if(release)await new Promise(resolve=>release(resolve));
        if(args.p_expected_user!==account) return{error:Error('Account changed')};
        if(name==='qm_community_status')return{data:{participating:joined}};
        if(name==='qm_community_participate'){joined=args.p_enabled;return{data:null}};
        if(name==='qm_community_submit')return failSync?{error:Error('Offline')}:{data:null};
        return{data:{verification:'unverified',course:COMMUNITY_COURSE,rows:joined?[row]:[],mine:joined?row:null}};
    }};
    const store=new CommunityStore({progress,levels,loadClient:async()=>({supabase:client})});store.setUser(account);
    return{store,progress,local,calls,row,set joined(v){joined=v},set failSync(v){failSync=v},set release(v){release=v},switch(id){account=id;progress.userId=id;store.setUser(id)}};
}
function dom(){const all=new Map();const node=()=>({children:[],attributes:{},handlers:{},replaceChildren(...c){this.children=c},appendChild(c){this.children.push(c)},setAttribute(k,v){this.attributes[k]=v},addEventListener(k,cb){this.handlers[k]=cb}});const document={createElement:node,getElementById(id){if(!all.has(id))all.set(id,node());return all.get(id)}};return{document,el:id=>document.getElementById(id)}}

test('community snapshot publishes completed API records only and preserves local data',()=>{
 const f=fixture();f.local.set(2,{completed:false,coinIds:[],time:1});f.local.set(3,{completed:true,coinIds:['unknown'],time:0});
 const before=JSON.stringify([...f.local]);assert.deepEqual(communitySnapshot(f.progress,levels),[
  {level_id:1,coin_ids:[levels[0].coins[0].id],best_time_ms:123450},{level_id:3,coin_ids:[],best_time_ms:null}]);assert.equal(JSON.stringify([...f.local]),before);
});
test('sharing is opt-in; join uploads real records, repeated reads deduplicate, withdraw stops uploads',async()=>{
 const f=fixture();assert.equal((await f.store.read('adventure',1)).rows.length,0);assert.ok(!f.calls.some(c=>c.name==='qm_community_submit'));
 await f.store.participate(true);let board=await f.store.read('level',1);assert.equal(board.rows[0].timeMs,123450);assert.equal(board.mine.isYou,true);
 assert.equal(f.calls.filter(c=>c.name==='qm_community_submit').length,1);
 f.local.get(1).time=120000;await f.store.sync();assert.equal(f.calls.filter(c=>c.name==='qm_community_submit').length,2);
 await f.store.participate(false);await f.store.sync();assert.equal(f.calls.filter(c=>c.name==='qm_community_submit').length,2);
 assert.equal(f.progress.getBestTime(1),120000);
});
test('failed uploads retry on refresh without preventing local records or cloud reads',async()=>{
 const f=fixture();f.joined=true;f.failSync=true;const data=await f.store.read('adventure',1);assert.equal(data.syncFailed,true);assert.equal(f.store.lastUploaded,null);
 f.failSync=false;assert.equal((await f.store.read('adventure',1)).syncFailed,false);assert.ok(f.store.lastUploaded);
});
test('queued account switches reject stale payloads before RPC and bind every write to its authenticated owner',async()=>{
 const f=fixture();f.joined=true;await f.store.status();const pending=f.store.sync();f.switch('account-b');await assert.rejects(pending,/Account changed/);
 assert.equal(f.calls.filter(c=>c.name==='qm_community_submit').length,0);assert.equal(f.store.participating,false);
 f.switch(null);assert.equal(await f.store.sync(),false);assert.equal(f.store.lastUploaded,null);
});
test('in-flight responses cannot publish old account state into the new session',async()=>{
 const f=fixture();f.joined=true;let release;f.release=cb=>release=cb;
 const pending=f.store.status();while(!release)await new Promise(resolve=>setImmediate(resolve));
 f.switch('account-b');release();await assert.rejects(pending,/Account changed/);assert.equal(f.store.participating,false);
});
test('response adapter rejects invalid scores and exposes only allowed public fields',()=>{
 const f=fixture();const response={verification:'unverified',course:COMMUNITY_COURSE,rows:[{...f.row,email:'secret',user_id:'private'}],mine:null};
 const data=communityResponse(response);assert.equal(data.rows[0].email,undefined);assert.equal(data.rows[0].user_id,undefined);
 for(const bad of [{coins:31},{completed:11},{time_ms:0},{rank:0}])assert.throws(()=>communityResponse({...response,rows:[{...f.row,...bad}]}));
 assert.throws(()=>communityResponse({...response,verification:'verified'}));
 assert.equal(communityResponse({...response,rows:[{...f.row,username:'someone@example.com'}]}).rows[0].username,'Adventurer');
});
test('online UI uses actual rows, highlights current player, honors explicit consent and clears on account changes',async()=>{
 const d=dom();let joins=0;const store={userId:'account-a',read:async()=>({rows:[{rank:2,username:'<script>safe text</script>',completed:2,coins:5,timeMs:null,isYou:true}],mine:{rank:2,completed:2,coins:5},participating:false}),participate:async()=>joins++};
 const view=new CommunityLeaderboard({document:d.document,store});await view.refresh();
 assert.equal(d.el('communityRows').children.length,1);assert.equal(d.el('communityRows').children[0].className,'community-current');
 assert.equal(d.el('communityRows').children[0].children[1].textContent,'<script>safe text</script> (You)');
 d.el('communityJoin').handlers.click();assert.equal(joins,0);
 await view.changeParticipation(true);assert.equal(joins,1);
 view.accountChanged();assert.equal(d.el('communityRows').children.length,0);assert.equal(d.el('communityMine').textContent,'');assert.equal(d.el('communityConsent').checked,false);
 store.read=async()=>{throw Error('Backend not installed')};await view.refresh();assert.match(d.el('communityStatus').textContent,/unavailable/);
});
