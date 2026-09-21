import {notFound} from 'next/navigation';
import VenueApp from '@/components/tab/venue-app';
import {venueById} from '@/lib/venues';

export default async function VenuePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const venue=venueById(id);
 if(!venue)notFound();
 return <VenueApp key={venue.id} venue={venue}/>;
}
