// @vitest-environment jsdom
import {afterAll,beforeAll,expect,it} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {MongoMemoryReplSet} from 'mongodb-memory-server';
import type {Server} from 'node:http';
import {createApp} from '../../src/app';
import {connectDatabase,disconnectDatabase} from '../../src/config/database';
import {seedResources} from '../../src/services/seed.service';
import {ResourceModel} from '../../src/models/Resource.model';
import {ReservationModel} from '../../src/models/Reservation.model';
import {BookingForm} from '../src/components/BookingForm';
import {UserReservations} from '../src/components/UserReservations';
import {api,createReservation} from '../src/api/campushubApi';
let db:MongoMemoryReplSet;let server:Server;
beforeAll(async()=>{db=await MongoMemoryReplSet.create({replSet:{count:1}});await connectDatabase(db.getUri());await ResourceModel.init();await ReservationModel.init();await seedResources();server=createApp().listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('No address');api.defaults.baseURL=`http://127.0.0.1:${address.port}/api/v1`;api.defaults.adapter='http';},30000);
afterAll(async()=>{cleanup();if(server)await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));await disconnectDatabase();await db?.stop()});
it('real MongoDB/API: UI double booking shows 409, cancellation refreshes and releases slot',async()=>{
 const payload={resourceId:'res-101',userId:'integration-student',startTime:new Date('2026-11-01T10:00').toISOString(),endTime:new Date('2026-11-01T11:00').toISOString()};
 await createReservation(payload);
 render(<BookingForm resource={{id:'res-101',name:'Study Room 302',location:'Library',type:'ROOM',isAvailable:true}} userId={payload.userId} onBooked={()=>{throw new Error('Conflict must not succeed')}} onClose={()=>{}}/>);
 fireEvent.change(screen.getByLabelText('Start time'),{target:{value:'2026-11-01T10:00'}});fireEvent.change(screen.getByLabelText('End time'),{target:{value:'2026-11-01T11:00'}});fireEvent.click(screen.getByText('Confirm booking'));
 expect((await screen.findByRole('alert')).textContent).toContain('already reserved');expect(screen.getByText('Confirm booking').hasAttribute('disabled')).toBe(false);cleanup();
 render(<UserReservations userId={payload.userId} revision={0}/>);fireEvent.click(await screen.findByText('Cancel reservation'));await screen.findByText('A little space for your next idea.');
 expect((await createReservation(payload)).status).toBe('CONFIRMED');
});
