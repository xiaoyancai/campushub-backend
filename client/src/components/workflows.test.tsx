// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {BookingForm} from './BookingForm';
import {UserReservations} from './UserReservations';
import {ResourceList} from './ResourceList';
import {api} from '../api/campushubApi';
import {AxiosError,AxiosHeaders,type AxiosResponse} from 'axios';
afterEach(()=>{cleanup();vi.restoreAllMocks()});
const resource={id:'res-101',name:'Study Room',type:'ROOM' as const,location:'Library',isAvailable:true};
const booking={id:'booking-1',resourceId:'res-101',userId:'student-001',startTime:'2026-11-01T10:00:00Z',endTime:'2026-11-01T11:00:00Z',status:'CONFIRMED' as const};
it('shows explicit conflict and recovers loading state, then allows retry',async()=>{
 const config={headers:new AxiosHeaders()};const response:AxiosResponse={data:{code:'DOUBLE_BOOKING',message:'Conflict'},status:409,statusText:'Conflict',headers:{},config};
 const post=vi.spyOn(api,'post').mockRejectedValueOnce(new AxiosError('Conflict','409',config,undefined,response)).mockResolvedValueOnce({data:booking});
 const done=vi.fn();render(<BookingForm resource={resource} userId="student-001" onBooked={done} onClose={()=>{}}/>);
 fireEvent.change(screen.getByLabelText('Start time'),{target:{value:'2026-11-01T10:00'}});fireEvent.change(screen.getByLabelText('End time'),{target:{value:'2026-11-01T11:00'}});
 fireEvent.click(screen.getByText('Confirm booking'));
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('already reserved'));
 expect(screen.getByText('Confirm booking').hasAttribute('disabled')).toBe(false);
 fireEvent.click(screen.getByText('Confirm booking'));await waitFor(()=>expect(done).toHaveBeenCalledOnce());
 expect(Object.keys(post.mock.calls[0]?.[1]??{}).sort()).toEqual(['endTime','resourceId','startTime','userId']);
});
it('rejects reversed times without dispatching',async()=>{const post=vi.spyOn(api,'post');render(<BookingForm resource={resource} userId="student-001" onBooked={()=>{}} onClose={()=>{}}/>);fireEvent.change(screen.getByLabelText('Start time'),{target:{value:'2026-11-01T11:00'}});fireEvent.change(screen.getByLabelText('End time'),{target:{value:'2026-11-01T10:00'}});fireEvent.click(screen.getByText('Confirm booking'));expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('End time'));expect(post).not.toHaveBeenCalled()});
it('handles 204 cancellation and refreshes the active list',async()=>{
 let cancelled=false;vi.spyOn(api,'get').mockImplementation(async(path)=>({data:String(path).includes('/user/')?(cancelled?[{...booking,status:'CANCELLED'}]:[booking]):[resource]}));
 const remove=vi.spyOn(api,'delete').mockImplementation(async()=>{cancelled=true;return {status:204}});
 render(<UserReservations userId="student-001" revision={0}/>);fireEvent.click(await screen.findByText('Cancel reservation'));await screen.findByText('A little space for your next idea.');expect(remove).toHaveBeenCalledWith('/reservations/booking-1');
});

it('keeps bookings visible and cancellable when resource names fail',async()=>{
 vi.spyOn(api,'get').mockImplementation(async path=>{
  if(String(path).includes('/user/')) return {data:[booking]};
  throw new AxiosError('Offline');
 });
 const remove=vi.spyOn(api,'delete').mockRejectedValue(new AxiosError('Offline'));
 render(<UserReservations userId="student-001" revision={0}/>);
 await screen.findByText('res-101');
 expect(screen.queryByText('A little space for your next idea.')).toBeNull();
 expect(await screen.findByText(/Resource names could not be loaded/)).toBeTruthy();
 fireEvent.click(screen.getByText('Cancel reservation'));
 expect((await screen.findByRole('alert')).textContent).toContain('Unable to connect');
 expect(remove).toHaveBeenCalledOnce();
 expect(screen.getByText('Cancel reservation').hasAttribute('disabled')).toBe(false);
 expect(screen.getByText('res-101')).toBeTruthy();
});

it('shows a load error without claiming there are no bookings and allows retry',async()=>{
 let failed=true;
 vi.spyOn(api,'get').mockImplementation(async path=>{
  if(!String(path).includes('/user/'))return {data:[resource]};
  if(failed)throw new AxiosError('Offline');
  return {data:[booking]};
 });
 render(<UserReservations userId="student-001" revision={0}/>);
 expect((await screen.findByRole('alert')).textContent).toContain('Unable to connect');
 expect(screen.queryByText('A little space for your next idea.')).toBeNull();
 expect(screen.getByText('Refresh').hasAttribute('disabled')).toBe(false);
 failed=false;fireEvent.click(screen.getByText('Refresh'));
 await screen.findByText('Cancel reservation');
 expect(screen.queryByRole('alert')).toBeNull();
});

it('restores booking controls after a network error',async()=>{
 vi.spyOn(api,'post').mockRejectedValue(new AxiosError('Offline'));
 render(<BookingForm resource={resource} userId="student-001" onBooked={()=>{}} onClose={()=>{}}/>);
 fireEvent.change(screen.getByLabelText('Start time'),{target:{value:'2026-11-01T10:00'}});
 fireEvent.change(screen.getByLabelText('End time'),{target:{value:'2026-11-01T11:00'}});
 fireEvent.click(screen.getByText('Confirm booking'));
 expect((await screen.findByRole('alert')).textContent).toContain('Unable to connect');
 expect(screen.getByText('Confirm booking').hasAttribute('disabled')).toBe(false);
 expect(screen.getByLabelText('Start time').hasAttribute('disabled')).toBe(false);
});

it('recovers resource loading after a network error',async()=>{
 vi.spyOn(api,'get').mockRejectedValueOnce(new AxiosError('Offline')).mockResolvedValueOnce({data:[resource]});
 render(<ResourceList onSelect={()=>{}}/>);
 expect((await screen.findByRole('alert')).textContent).toContain('Unable to connect');
 fireEvent.click(screen.getByText('Try again'));
 await screen.findByText('Study Room');
 expect(screen.queryByRole('alert')).toBeNull();
});

it('ignores a stale resource response after changing the filter',async()=>{
 let resolveOld: (value:{data:typeof resource[]})=>void = ()=>{throw new Error('Request not started')};
 const old=new Promise<{data:typeof resource[]}>(resolve=>{resolveOld=resolve});
 vi.spyOn(api,'get').mockImplementationOnce(()=>old).mockResolvedValueOnce({data:[{...resource,id:'equipment-1',name:'Camera',type:'EQUIPMENT'}]});
 render(<ResourceList onSelect={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Equipment'}));
 await screen.findByText('Camera');
 await act(async()=>{resolveOld({data:[resource]});await old;});
 await waitFor(()=>expect(screen.queryByText('Study Room')).toBeNull());
 expect(screen.getByText('Camera')).toBeTruthy();
});

it('ignores old student bookings after switching students',async()=>{
 let resolveOld: (value:{data:typeof booking[]})=>void = ()=>{throw new Error('Request not started')};
 const old=new Promise<{data:typeof booking[]}>(resolve=>{resolveOld=resolve});
 vi.spyOn(api,'get').mockImplementation(async path=>{
  if(!String(path).includes('/user/'))return {data:[resource]};
  if(String(path).endsWith('student-001'))return old;
  return {data:[]};
 });
 const view=render(<UserReservations userId="student-001" revision={0}/>);
 view.rerender(<UserReservations userId="student-002" revision={0}/>);
 await screen.findByText('A little space for your next idea.');
 await act(async()=>{resolveOld({data:[booking]});await old;});
 await waitFor(()=>expect(screen.queryByText('Cancel reservation')).toBeNull());
});
