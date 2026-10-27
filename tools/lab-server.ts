// Development-only temporary database. All data is removed when this process stops.
import {MongoMemoryReplSet} from 'mongodb-memory-server';
import {createApp} from '../src/app.js';
import {connectDatabase,disconnectDatabase} from '../src/config/database.js';
import {seedResources} from '../src/services/seed.service.js';
import {ResourceModel} from '../src/models/Resource.model.js';
import {ReservationModel} from '../src/models/Reservation.model.js';
const database=await MongoMemoryReplSet.create({replSet:{count:1}});
await connectDatabase(database.getUri());
await ResourceModel.init();await ReservationModel.init();await seedResources();
const server=createApp().listen(3000,'127.0.0.1',()=>console.log('Lab API: http://127.0.0.1:3000 — temporary database; data resets on exit.'));
let stopping=false;
async function stop():Promise<void>{if(stopping)return;stopping=true;await new Promise<void>(resolve=>server.close(()=>resolve()));await disconnectDatabase();await database.stop();}
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{void stop().catch(()=>{process.exitCode=1})});
