let initialLocations = [
    {
        title: 'March Field Air Museum',
        location: {lat: 33.882734, lng: -117.266685}
    },
    {
        title: 'Mount Rubidoux',
        location: {lat: 33.984312, lng: -117.392679}
    },
    {
        title: 'Riverside National Cemetery',
        location: {lat: 33.887423, lng: -117.279914}
    },
    {
        title: 'Fox Performing Arts Center',
        location: {lat: 33.984015, lng: -117.375271}
    },
    {
        title: 'California Citrus State Historic Park',
        location: {lat: 33.899302, lng: -117.426217}
    },
    {
        title: 'University of California, Riverside Botanic Gardens',
        location: {lat: 33.971650, lng: -117.320556}
    }
];

let map;
let infowindow;

function Location(data) {
    let self = this;
    this.title = data.title;
    this.detail = {
        oriUrl: '',
        exintro: ''
    };
    // visible control flag for location list and marker
    this.visible = ko.observable(true);

    let wikiUrl = 'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=info%7Cextracts&utf8=1&inprop=url&exintro=1&explaintext=1&formatversion=latest&titles=' + data.title;

    // use CORS proxy to avoid "No 'Access-Control-Allow-Origin' header is present on the requested resource" error 
    $.getJSON('https://cors-anywhere.herokuapp.com/' + wikiUrl).done(function(data) {
        let page = data.query.pages[0];
        self.detail.oriUrl = page.fullurl;
        self.detail.exintro = page.extract;
    }).fail(function(){
        alert("There is an error with the MediaWiki API. Please try again later");
    });

    this.marker = new google.maps.Marker({
        position: data.location,
        map: map,
        title: data.title
    });

    this.showMarker = ko.computed(function() {
        if(this.visible() === true) {
            this.marker.setMap(map);
        } else {
            this.marker.setMap(null);
        }
        return true;
    }, this);

    self.marker.addListener('click', function(){
        populateInfoWindow(this, infoWindow, self.detail);
        self.marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            self.marker.setAnimation(null);
        }, 2100);
    });

    // bind listItem and marker
    this.bindMarker = function() {
        google.maps.event.trigger(self.marker, 'click');
    };
}

function populateInfoWindow(marker, infowindow, detail) {
    // Check to make sure the infowindow is not already opened on this marker.
    if (infowindow.marker != marker) {
        // Clear the infowindow content to give the streetview time to load.
        infowindow.setContent('');
        infowindow.marker = marker;
        // Make sure the marker property is cleared if the infowindow is closed.
        infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
        });
        
        let wikiDescription = '<div class="description"><a href="' + detail.oriUrl + '">click here for details</a><p>' + detail.exintro + '</p></div>';

        let streetViewService = new google.maps.StreetViewService();
        let radius = 50;
        // In case the status is OK, which means the pano was found, compute the
        // position of the streetview image, then calculate the heading, then get a
        // panorama from that and set the options
        let getStreetView = function(data, status) {
            if (status == google.maps.StreetViewStatus.OK) {
                let nearStreetViewLocation = data.location.latLng;
                let heading = google.maps.geometry.spherical.computeHeading(
                nearStreetViewLocation, marker.position);

                infowindow.setContent('<div class="title">' + marker.title + '</div><div id="pano"></div>' + wikiDescription);
                let panoramaOptions = {
                    position: nearStreetViewLocation,
                    pov: {
                        heading: heading,
                        pitch: 30
                    }
                };
                let panorama = new google.maps.StreetViewPanorama(
                document.getElementById('pano'), panoramaOptions);
            } else {
                infowindow.setContent('<div>' + marker.title + '</div><div>No Street View Found</div>' + wikiDescription);
            }
        };
        // Use streetview service to get the closest streetview image within
        // 50 meters of the markers position
        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
        // Open the infowindow on the correct marker.
        infowindow.open(map, marker);
    }
}

function AppViewModel() {
    let self = this;

    this.searchTerm = ko.observable("");
    this.locationList = ko.observableArray([]);

    map = new google.maps.Map(document.getElementById('map'), {
            zoom: 12,
            center: {lat: 33.934912, lng: -117.376704},
            mapTypeControl: false
    });
    infoWindow = new google.maps.InfoWindow();

    initialLocations.forEach(function(initialLocation){
        self.locationList.push(new Location(initialLocation));
    });

    // filter via serch() and set visibility
    self.filteredList = ko.computed( function() {
        let filter = self.searchTerm().toLowerCase();
        if (!filter) {
            self.locationList().forEach(function(location){
                location.visible(true);
            });
            return self.locationList();
        } else {
            return ko.utils.arrayFilter(self.locationList(), function(location) {
                let string = location.title.toLowerCase();
                let isVisible = (string.search(filter) >= 0);
                location.visible(isVisible);
                return isVisible;
            });
        }
    }, self);
}

function startApp() {
    ko.applyBindings(new AppViewModel());
}

function errorHandling() {
    alert("Google Maps has failed to load. Please check your internet connection and try again.");
}
