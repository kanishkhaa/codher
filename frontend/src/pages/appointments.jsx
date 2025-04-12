import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { 
  MapPin, Clock, Navigation2, Star, Search, Plus, 
  Loader, MapIcon, Layers, X, Calendar, Bell 
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import Sidebar from '../../components/sidebar';

// Fix for Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom location marker icon
const userLocationIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3437/3437826.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

// Custom hospital marker icon
const hospitalIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/4320/4320317.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Component to recenter map when location changes
const SetViewOnChange = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [center, map]);
  return null;
};

// Add the missing AppointmentModal component
const AppointmentModal = ({ hospital, onClose, onSchedule, userLocation }) => {
  const [dateTime, setDateTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!dateTime) {
      setError('Please select date and time');
      return;
    }
    
    const appointmentData = {
      hospitalName: hospital.name,
      address: hospital.vicinity,
      dateTime: new Date(dateTime),
      purpose: purpose,
      userLat: userLocation.lat,
      userLng: userLocation.lng,
      hospitalLat: hospital.location.lat,
      hospitalLng: hospital.location.lng
    };
    
    onSchedule(appointmentData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg w-full max-w-md p-6 border border-slate-700 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Schedule Appointment</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="bg-slate-800 p-4 rounded-lg mb-4">
          <h3 className="text-lg font-semibold text-white">{hospital.name}</h3>
          <p className="text-sm text-slate-400 mt-1">{hospital.vicinity}</p>
          <div className="flex items-center mt-2">
            <MapPin size={16} className="text-indigo-400" />
            <span className="text-sm ml-1 text-slate-300">{hospital.distance} km away</span>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Date & Time
            </label>
            <input
              type="datetime-local"
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-indigo-500"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Purpose (Optional)
            </label>
            <textarea
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-indigo-500 h-24"
              placeholder="Describe the reason for your appointment"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>
          
          {error && (
            <div className="bg-red-900/50 text-red-300 p-2 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 text-slate-300 py-2 rounded-lg hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
            >
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Custom component to display scheduled appointments
const AppointmentsList = ({ appointments, cancelAppointment }) => {
  const currentTime = new Date();
  
  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 mt-6">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
        <Calendar className="mr-2 text-indigo-400" size={20} />
        Scheduled Appointments
      </h2>
      
      {appointments.length === 0 ? (
        <div className="text-center py-6 text-slate-400">No appointments scheduled yet.</div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment, index) => {
            const appointmentTime = new Date(appointment.dateTime);
            const isPast = appointmentTime < currentTime;
            const isUpcoming = !isPast && appointmentTime - currentTime < 24 * 60 * 60 * 1000; // 24 hours
            
            return (
              <div 
                key={index} 
                className={`p-4 rounded-lg border ${
                  isPast ? 'bg-slate-800/50 border-slate-700' : 
                  isUpcoming ? 'bg-indigo-900/30 border-indigo-600' : 'bg-slate-800 border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{appointment.hospitalName}</h3>
                    <p className="text-sm text-slate-400">{appointment.address}</p>
                    
                    <div className="flex items-center mt-2 text-slate-300">
                      <Calendar size={16} className="text-indigo-400" />
                      <span className="text-sm ml-1">
                        {appointmentTime.toLocaleDateString(undefined, { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                      <Clock size={16} className="text-indigo-400 ml-4" />
                      <span className="text-sm ml-1">
                        {appointmentTime.toLocaleTimeString(undefined, { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    
                    {appointment.purpose && (
                      <p className="text-sm text-slate-300 mt-2">
                        <span className="text-indigo-400">Purpose:</span> {appointment.purpose}
                      </p>
                    )}
                  </div>
                  
                  {isUpcoming && (
                    <div className="flex items-center bg-indigo-500/20 px-2 py-1 rounded-full">
                      <Bell size={14} className="text-indigo-300 animate-pulse" />
                      <span className="text-xs ml-1 text-indigo-300">Upcoming</span>
                    </div>
                  )}
                  
                  {isPast && (
                    <div className="flex items-center bg-slate-700/20 px-2 py-1 rounded-full">
                      <span className="text-xs text-slate-400">Past</span>
                    </div>
                  )}
                </div>
                
                <div className="flex mt-3 space-x-2">
                  {!isPast && (
                    <button
                      onClick={() => cancelAppointment(index)}
                      className="flex items-center text-red-400 hover:text-red-300 text-sm bg-slate-900 px-3 py-2 rounded-md"
                    >
                      <X size={16} className="mr-1" />
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => window.open(`https://www.openstreetmap.org/directions?from=${encodeURIComponent(appointment.userLat)},${encodeURIComponent(appointment.userLng)}&to=${encodeURIComponent(appointment.hospitalLat)},${encodeURIComponent(appointment.hospitalLng)}`, '_blank')}
                    className="flex items-center text-indigo-400 hover:text-indigo-300 text-sm bg-slate-900 px-3 py-2 rounded-md"
                  >
                    <Navigation2 size={16} className="mr-1" />
                    Get directions
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};



const Notification = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className="fixed top-4 right-4 bg-indigo-600 text-white p-4 rounded-lg shadow-lg z-[9999] flex items-center animate-slideIn">
      <Bell className="mr-2" size={20} />
      <div>
        <p className="font-medium">{message}</p>
      </div>
      <button onClick={onClose} className="ml-4 text-white/80 hover:text-white">
        <X size={18} />
      </button>
    </div>
  );
};

// Updated NotificationCenter component
const NotificationCenter = ({ notifications, onDismissAll, onDismissOne }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button 
        className="relative p-2 text-slate-300 hover:text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
            {notifications.length}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 rounded-lg shadow-lg border border-slate-700 z-[9999]">
          <div className="p-3 border-b border-slate-700 flex justify-between items-center">
            <h3 className="text-white font-medium">Notifications</h3>
            <button 
              onClick={() => {
                onDismissAll();
                setIsOpen(false);
              }}
              className="text-slate-400 hover:text-white text-xs"
            >
              Clear all
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                No notifications
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div key={index} className="p-3 border-b border-slate-800 hover:bg-slate-800">
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <p className="text-white text-sm">{notification.message}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <button 
                      onClick={() => onDismissOne(index)} 
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AppointmentsPage = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHospitals, setFilteredHospitals] = useState([]);
  const [mapType, setMapType] = useState('street');
  const [appointments, setAppointments] = useState([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [mapZoom, setMapZoom] = useState(13);

  // Fetch user location and hospitals
  useEffect(() => {
    if (!navigator.geolocation) {
      addNotification('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentPosition(pos);
        fetchNearbyHospitals(pos);
      },
      (error) => {
        console.error('Geolocation error:', error);
        addNotification('Unable to get location. Please enable location services.');
        // Fallback to Mumbai location if geolocation fails
        const mumbaiPos = { lat: 19.0760, lng: 72.8777 };
        setCurrentPosition(mumbaiPos);
        fetchNearbyHospitals(mumbaiPos);
      }
    );
  }, []);

  // Fetch nearby hospitals using API
  const fetchNearbyHospitals = async (position) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `https://women-app.onrender.com/api/hospitals?lat=${position.lat}&lon=${position.lng}`
      );
      
      if (response.data && response.data.length > 0) {
        const processedHospitals = response.data.map((place, index) => {
          // Calculate distance if we have coordinates
          const distance = calculateDistance(
            position.lat, 
            position.lng, 
            place.lat || position.lat + (Math.random() - 0.5) * 0.01,
            place.lon || position.lng + (Math.random() - 0.5) * 0.01
          );

          return {
            id: place.id || `hospital-${index}`,
            name: place.name || 'Hospital',
            vicinity: place.address || 'Address not available',
            location: { 
              lat: place.lat || position.lat + (Math.random() - 0.5) * 0.01, 
              lng: place.lon || position.lng + (Math.random() - 0.5) * 0.01 
            },
            rating: (Math.random() * 2 + 3).toFixed(1),
            user_ratings_total: Math.floor(Math.random() * 500),
            distance: distance.toFixed(1),
            time: Math.round(distance * 3),
          };
        });
        
        setHospitals(processedHospitals);
        setFilteredHospitals(processedHospitals);
        addNotification(`Found ${processedHospitals.length} hospitals nearby`);
      } else {
        addNotification('No hospitals found in the area.');
      }
    } catch (error) {
      console.error("Error fetching hospitals:", error);
      addNotification('Failed to load hospitals. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Haversine formula for distance calculation
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg) => deg * (Math.PI / 180);

  // Add notification to the list
  const addNotification = (message) => {
    const newNotification = {
      message,
      timestamp: new Date()
    };
    setNotifications(prev => [newNotification, ...prev]);
    setNotification(message);
  };

  // Dismiss all notifications
  const dismissAllNotifications = () => {
    setNotifications([]);
  };

  // Dismiss one notification
  const dismissOneNotification = (index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  // Filter hospitals based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredHospitals(hospitals);
    } else {
      const filtered = hospitals.filter(
        (hospital) =>
          hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          hospital.vicinity.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredHospitals(filtered);
    }
  }, [searchQuery, hospitals]);

  // Check for upcoming appointments
  useEffect(() => {
    if (appointments.length === 0) return;
    
    const checkAppointments = () => {
      const now = new Date();
      
      appointments.forEach(appointment => {
        const appointmentTime = new Date(appointment.dateTime);
        const timeDiff = appointmentTime - now;
        
        if (timeDiff > 0 && timeDiff <= 15 * 60 * 1000) {
          addNotification(`Upcoming appointment at ${appointment.hospitalName} in 15 minutes`);
        }
      });
    };
    
    checkAppointments();
    const interval = setInterval(checkAppointments, 60000);
    
    return () => clearInterval(interval);
  }, [appointments]);

  const scheduleAppointment = (hospital) => {
    if (hospital) {
      setSelectedHospital(hospital);
      setShowAppointmentModal(true);
    } else if (hospitals.length > 0) {
      setSelectedHospital(hospitals[0]);
      setShowAppointmentModal(true);
    } else {
      addNotification('Please search for hospitals first');
    }
  };

  const handleScheduleAppointment = (appointmentData) => {
    setAppointments([...appointments, appointmentData]);
    addNotification(`Appointment scheduled at ${appointmentData.hospitalName}`);
    setShowAppointmentModal(false);
  };

  const cancelAppointment = (index) => {
    const newAppointments = [...appointments];
    const canceledAppointment = newAppointments.splice(index, 1)[0];
    setAppointments(newAppointments);
    addNotification(`Appointment at ${canceledAppointment.hospitalName} canceled`);
  };

  const HospitalCard = ({ hospital }) => {
    return (
      <div
        className="bg-slate-800 p-4 rounded-lg mb-4 border border-slate-700 hover:border-indigo-500 transition-all cursor-pointer"
        onClick={() => {
          setSelectedHospital(hospital);
          // Center map on selected hospital
          if (currentPosition) {
            setCurrentPosition({
              lat: hospital.location.lat,
              lng: hospital.location.lng
            });
            setMapZoom(15); // Zoom in when selecting a hospital
          }
        }}
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-white">{hospital.name}</h3>
            <p className="text-sm text-slate-400 mt-1">{hospital.vicinity}</p>
          </div>
          <div className="flex items-center">
            <Star size={16} className="text-yellow-400" />
            <span className="text-white ml-1">{hospital.rating}</span>
            <span className="text-slate-400 text-sm ml-1">({hospital.user_ratings_total})</span>
          </div>
        </div>
        <div className="flex items-center mt-3 text-slate-300">
          <MapPin size={16} className="text-indigo-400" />
          <span className="text-sm ml-1">{hospital.distance} km</span>
          <Clock size={16} className="text-indigo-400 ml-4" />
          <span className="text-sm ml-1">{hospital.time} mins</span>
        </div>
        <div className="flex mt-3 space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://www.openstreetmap.org/directions?from=${currentPosition.lat},${currentPosition.lng}&to=${hospital.location.lat},${hospital.location.lng}`, '_blank');
            }}
            className="flex items-center text-indigo-400 hover:text-indigo-300 text-sm bg-slate-900 px-3 py-2 rounded-md"
          >
            <Navigation2 size={16} className="mr-1" />
            Get directions
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              scheduleAppointment(hospital);
            }}
            className="flex items-center text-white bg-indigo-600 hover:bg-indigo-700 text-sm px-3 py-2 rounded-md"
          >
            <Plus size={16} className="mr-1" />
            Book
          </button>
        </div>
      </div>
    );
  };

  // Function to reset map view to user's location
  const resetMapView = () => {
    if (currentPosition && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentPosition(pos);
          setMapZoom(13);
        },
        () => {
          // If failed, just reset zoom
          setMapZoom(13);
        }
      );
    }
  };

  return (
    <>
      <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div
        className={`p-4 md:p-6 ${isSidebarOpen ? 'ml-64' : 'ml-16'} transition-all duration-300 bg-slate-950 min-h-screen`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Appointments</h1>
            <p className="text-slate-400">Schedule and manage your medical appointments</p>
          </div>
          <div className="flex items-center mt-2 sm:mt-0">
            <NotificationCenter 
              notifications={notifications} 
              onDismissAll={dismissAllNotifications}
              onDismissOne={dismissOneNotification}
            />
            <button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center ml-3"
              onClick={() => scheduleAppointment(selectedHospital)}
            >
              <Plus size={18} className="mr-1" />
              Schedule Appointment
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Nearby Hospitals</h2>
                {currentPosition && (
                  <button 
                    onClick={resetMapView}
                    className="text-indigo-400 hover:text-indigo-300 text-sm bg-slate-800 px-3 py-1.5 rounded-md flex items-center"
                  >
                    <MapPin size={14} className="mr-1" />
                    Reset view
                  </button>
                )}
              </div>
              
              {currentPosition && (
                <div className="bg-slate-800 rounded-lg p-3 mb-4">
                  <div className="flex items-center">
                    <MapPin size={18} className="text-indigo-400 mr-2" />
                    <div>
                      <h3 className="text-sm font-medium text-white">Your Location</h3>
                      <p className="text-xs text-slate-400">
                        Lat: {currentPosition.lat.toFixed(4)}, Lng: {currentPosition.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="w-full h-[400px] relative">
                {currentPosition ? (
                  <MapContainer
                    center={[currentPosition.lat, currentPosition.lng]}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
                    className="rounded-lg z-10"
                  >
                    <SetViewOnChange center={[currentPosition.lat, currentPosition.lng]} />
                    {mapType === 'street' && (
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                    )}
                    {mapType === 'satellite' && (
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      />
                    )}
                    <Marker position={[currentPosition.lat, currentPosition.lng]} icon={userLocationIcon}>
                      <Popup className="custom-popup">
                        <div className="text-center p-1">
                          <strong>Your Location</strong>
                        </div>
                      </Popup>
                    </Marker>
                    {filteredHospitals.map((hospital) => (
                      <Marker
                        key={hospital.id}
                        position={[hospital.location.lat, hospital.location.lng]}
                        icon={hospitalIcon}
                        eventHandlers={{
                          click: () => {
                            setSelectedHospital(hospital);
                          },
                        }}
                      >
                        <Popup className="custom-popup">
                          <div className="p-1 max-w-xs">
                            <h3 className="font-bold text-slate-900">{hospital.name}</h3>
                            <p className="text-sm text-slate-600">{hospital.vicinity}</p>
                            <div className="flex items-center mt-1">
                              <Star size={14} className="text-yellow-500" />
                              <span className="text-sm ml-1">{hospital.rating}</span>
                              <span className="text-slate-500 text-xs ml-1">({hospital.user_ratings_total})</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-slate-600">
                                {hospital.distance} km • {hospital.time} mins
                              </span>
                              <button
                                onClick={() => scheduleAppointment(hospital)}
                                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded"
                              >
                                Book
                              </button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                ) : (
                  <div className="flex items-center justify-center h-full bg-slate-800 rounded-lg">
                  <Loader size={24} className="text-indigo-400 animate-spin mr-2" />
                  <span className="text-slate-300">Loading map...</span>
                </div>
              )}
              
              <div className="absolute bottom-4 right-4 z-20 bg-slate-800 rounded-lg shadow-lg p-2 flex space-x-2">
                <button
                  onClick={() => setMapType('street')}
                  className={`p-2 rounded-md ${mapType === 'street' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                  title="Street Map"
                >
                  <MapIcon size={18} />
                </button>
                <button
                  onClick={() => setMapType('satellite')}
                  className={`p-2 rounded-md ${mapType === 'satellite' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                  title="Satellite Map"
                >
                  <Layers size={18} />
                </button>
              </div>
            </div>
          </div>
          
          <AppointmentsList 
            appointments={appointments} 
            cancelAppointment={cancelAppointment} 
          />
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
            <div className="flex items-center mb-4">
              <Search size={18} className="text-slate-400 mr-2" />
              <input
                type="text"
                className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-indigo-500"
                placeholder="Search hospitals"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader size={24} className="text-indigo-400 animate-spin mr-2" />
                  <span className="text-slate-300">Loading hospitals...</span>
                </div>
              ) : filteredHospitals.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No hospitals found. Try adjusting your search.
                </div>
              ) : (
                filteredHospitals.map((hospital) => (
                  <HospitalCard key={hospital.id} hospital={hospital} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    {showAppointmentModal && selectedHospital && (
      <AppointmentModal
        hospital={selectedHospital}
        onClose={() => setShowAppointmentModal(false)}
        onSchedule={handleScheduleAppointment}
        userLocation={currentPosition}
      />
    )}
    
    {notification && (
      <Notification
        message={notification}
        onClose={() => setNotification(null)}
      />
    )}
  </>
);
};

export default AppointmentsPage;