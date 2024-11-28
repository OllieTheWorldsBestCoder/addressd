declare module 'google-maps-types' {
  export type AddressType = 
    | 'street_number'
    | 'route'
    | 'premise'
    | 'subpremise'
    | 'postal_code'
    | 'postal_code_prefix'
    | 'locality'
    | 'administrative_area_level_1'
    | 'administrative_area_level_2'
    | 'country'
    | 'street_address'
    | 'point_of_interest'
    | 'establishment'
    | 'political'
    | 'postal_town'
    | 'accounting'
    | 'airport'
    | 'amusement_park'
    | 'aquarium'
    | 'art_gallery'
    | 'atm'
    | 'bakery'
    | 'bank'
    | 'bar'
    | 'beauty_salon'
    | 'bicycle_store'
    | 'book_store'
    | 'bowling_alley'
    | 'bus_station'
    | 'cafe'
    | 'campground'
    | 'car_dealer'
    | 'car_rental'
    | 'car_repair'
    | 'car_wash'
    | 'casino'
    | 'cemetery'
    | 'church'
    | 'city_hall'
    | 'clothing_store'
    | 'convenience_store'
    | 'courthouse'
    | 'dentist'
    | 'department_store'
    | 'doctor'
    | 'drugstore'
    | 'electrician'
    | 'electronics_store'
    | 'embassy'
    | 'fire_station'
    | 'florist'
    | 'funeral_home'
    | 'furniture_store'
    | 'gas_station'
    | 'gym'
    | 'hair_care'
    | 'hardware_store'
    | 'hindu_temple'
    | 'home_goods_store'
    | 'hospital'
    | 'insurance_agency'
    | 'jewelry_store'
    | 'laundry'
    | 'lawyer'
    | 'library'
    | 'light_rail_station'
    | 'liquor_store'
    | 'local_government_office'
    | 'locksmith'
    | 'lodging'
    | 'meal_delivery'
    | 'meal_takeaway'
    | 'mosque'
    | 'movie_rental'
    | 'movie_theater'
    | 'moving_company'
    | 'museum'
    | 'night_club'
    | 'painter'
    | 'park'
    | 'parking'
    | 'pet_store'
    | 'pharmacy'
    | 'physiotherapist'
    | 'plumber'
    | 'police'
    | 'post_office'
    | 'primary_school'
    | 'real_estate_agency'
    | 'restaurant'
    | 'roofing_contractor'
    | 'rv_park'
    | 'school'
    | 'secondary_school'
    | 'shoe_store'
    | 'shopping_mall'
    | 'spa'
    | 'stadium'
    | 'storage'
    | 'store'
    | 'subway_station'
    | 'supermarket'
    | 'synagogue'
    | 'taxi_stand'
    | 'tourist_attraction'
    | 'train_station'
    | 'transit_station'
    | 'travel_agency'
    | 'university'
    | 'veterinary_care'
    | 'zoo';

  export interface GeocodeResult {
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
      location_type?: 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE';
      viewport?: {
        northeast: {
          lat: number;
          lng: number;
        };
        southwest: {
          lat: number;
          lng: number;
        };
      };
      bounds?: {
        northeast: {
          lat: number;
          lng: number;
        };
        southwest: {
          lat: number;
          lng: number;
        };
      };
    };
    place_id: string;
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: AddressType[];
    }>;
    types?: AddressType[];
    partial_match?: boolean;
  }
} 