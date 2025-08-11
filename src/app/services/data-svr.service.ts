import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ServiceFuzzAccount } from '../models/ServiceFuzzAccounts';
import { map, Observable, BehaviorSubject, of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CookieService } from 'ngx-cookie-service';
import { BusinessBasicInfo } from '../models/businessbasicinfo';
import confetti from 'canvas-confetti';
import { ServiceFuzzFreeTrialSubscriptions } from '../models/FreeTrialDetails';
import JSConfetti from 'js-confetti'; // Import the JSConfetti class
import { ChatMessage } from '../models/chat-message';
import { BusinessRegistration, BusinessPlaceAndServicesJunction } from '../models/business-registration';
import { ServicesForBusiness } from '../models/services-for-business';
import { BusinessPlace } from '../models/business-place';
import { BusinessRegistrationDto } from '../models/business-registration-dto';

@Injectable({
  providedIn: 'root'
})
export class DataSvrService {
  private static instance: DataSvrService;
  public geminiResponse: string = '';
  private readonly instanceId = Math.random();
  private apiUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';
  private _currentUser = new BehaviorSubject<ServiceFuzzAccount | undefined>(undefined);
  private _jwtToken = new BehaviorSubject<string | undefined>(undefined);
  private _signInToken = new BehaviorSubject<string | undefined>(undefined);
  private tokenRefreshTimer: any;
  private readonly REGULAR_TOKEN_KEY = 'sf_auth_token';
  private readonly SIGNIN_TOKEN_COOKIE = 'sf_signin_token';
  public businesses: BusinessBasicInfo[] = [];
  public freeTrialDetails: ServiceFuzzFreeTrialSubscriptions | undefined;
  public jsConfetti: JSConfetti = new JSConfetti();

  // Business Registration State
  private _businessRegistration = new BehaviorSubject<BusinessRegistration>({
    basicInfo: {} as BusinessBasicInfo,
    services: [],
    places: [],
    serviceAssignments: [],
    currentStep: 0,
    isCompleted: false,
    operationType: 'solo',
    staff: []
  });
  public businessRegistration$ = this._businessRegistration.asObservable();

  // Chat related properties
  private _chatMessages = new BehaviorSubject<ChatMessage[]>([]);
  public chatMessages$ = this._chatMessages.asObservable();

  // Temporary business details storage
  private _tempBusinessDetails = new BehaviorSubject<BusinessRegistrationDto | null>(null);

  constructor(private http: HttpClient, private snackBar: MatSnackBar, private cookieService: CookieService) {
    if (DataSvrService.instance) {
      console.warn('Attempting to create a second instance of DataSvrService');
      return DataSvrService.instance;
    }
    DataSvrService.instance = this;
    
    // Try to restore user session from stored tokens
    this.initializeAuthenticationState();
  }

  

  // Business Registration Methods
  get currentBusinessRegistration(): BusinessRegistration {
    return this._businessRegistration.value;
  }

  updateBusinessRegistration(registration: BusinessRegistration) {
    this._businessRegistration.next(registration);
  }

  updateBasicInfo(basicInfo: BusinessBasicInfo) {
    const current = this._businessRegistration.value;
    this._businessRegistration.next({
      ...current,
      basicInfo: basicInfo
    });
  }

  addService(service: ServicesForBusiness | string) {
    if (typeof service === 'string') {
      service = {
        serviceName: service,
        serviceDescription: service,
        serviceID: this.generateId(),
        duration: 30,
        serviceEstimatedTime: '30 minutes',
        businessID: '',
        servicePrice: 0,
        servicePriceCurrencyUnit: 'USD',
        serviceImageUrl: ''
      };
    } else {
      service.serviceID = this.generateId();
      if (!service.serviceName) service.serviceName = 'Unnamed Service';
      if (!service.serviceDescription) service.serviceDescription = 'No description provided.';
      if (!service.duration) service.duration = 30;
      if (!service.serviceEstimatedTime) service.serviceEstimatedTime = '30 minutes';
      if (!service.businessID) service.businessID = '';
      if (service.servicePrice === undefined || service.servicePrice === null) service.servicePrice = 0;
      if (!service.servicePriceCurrencyUnit) service.servicePriceCurrencyUnit = 'USD';
      if (!service.serviceImageUrl) service.serviceImageUrl = '';
    }
    const current = this._businessRegistration.value;
    this._businessRegistration.next({
      ...current,
      services: [...current.services, service]
    });
  }

  updateService(serviceId: string, updatedService: ServicesForBusiness) {
    const current = this._businessRegistration.value;
    if (!updatedService.duration) updatedService.duration = 30; // default duration
    const services = current.services.map(service => 
      service.serviceID === serviceId ? { ...updatedService, serviceID: serviceId } : service
    );
    this._businessRegistration.next({
      ...current,
      services: services
    });
  }

  removeService(serviceId: string) {
    const current = this._businessRegistration.value;
    const services = current.services.filter(service => service.serviceID !== serviceId);
    // Also remove from places
    const places = current.places.map(place => ({
      ...place,
      assignedServiceIDs: place.assignedServiceIDs.filter(id => id !== serviceId)
    }));
    this._businessRegistration.next({
      ...current,
      services: services,
      places: places
    });
  }

  addPlace(place: BusinessPlace) {
    const current = this._businessRegistration.value;
    place.placeID = this.generateId();
    place.assignedServiceIDs = [];
    this._businessRegistration.next({
      ...current,
      places: [...current.places, place]
    });
  }

  updatePlace(placeId: string, updatedPlace: BusinessPlace) {
    const current = this._businessRegistration.value;
    const places = current.places.map(place => 
      place.placeID === placeId ? { ...updatedPlace, placeID: placeId } : place
    );
    this._businessRegistration.next({
      ...current,
      places: places
    });
  }

  removePlace(placeId: string) {
    const current = this._businessRegistration.value;
    const places = current.places.filter(place => place.placeID !== placeId);
    this._businessRegistration.next({
      ...current,
      places: places
    });
  }

  assignServiceToPlace(serviceId: string, placeId: string, serviceType?: string) {
    const current = this._businessRegistration.value;
    console.log('Assigning service:', { serviceId, placeId });
    console.log('Current places before assignment:', current.places.map(p => ({ id: p.placeID, name: p.placeName, services: p.assignedServiceIDs })));
    
    // Update the junction table
    const businessId = current.basicInfo.businessID || '';
    const existingAssignment = current.serviceAssignments.find(
      sa => sa.serviceID === serviceId && sa.placeId === placeId
    );
    
    if (!existingAssignment) {
      const newAssignment: BusinessPlaceAndServicesJunction = {
        businessID: businessId,
        serviceID: serviceId,
        placeId: placeId,
        serviceType: serviceType
      };
      current.serviceAssignments.push(newAssignment);
    }
    
    // Also update the existing assignedServiceIDs approach for backward compatibility
    const places = current.places.map(place => {
      if (place.placeID === placeId) {
        const assignedServices = [...place.assignedServiceIDs];
        if (!assignedServices.includes(serviceId)) {
          assignedServices.push(serviceId);
          console.log(`Added service ${serviceId} to place ${placeId}. New services:`, assignedServices);
        } else {
          console.log(`Service ${serviceId} already assigned to place ${placeId}`);
        }
        return { ...place, assignedServiceIDs: assignedServices };
      }
      return place;
    });
    
    this._businessRegistration.next({
      ...current,
      places: places,
      serviceAssignments: current.serviceAssignments
    });
    
    console.log('Places after assignment:', places.map(p => ({ id: p.placeID, name: p.placeName, services: p.assignedServiceIDs })));
  }

  unassignServiceFromPlace(serviceId: string, placeId: string) {
    const current = this._businessRegistration.value;
    
    // Remove from junction table
    const updatedAssignments = current.serviceAssignments.filter(
      sa => !(sa.serviceID === serviceId && sa.placeId === placeId)
    );
    
    // Also remove from existing assignedServiceIDs approach for backward compatibility
    const places = current.places.map(place => {
      if (place.placeID === placeId) {
        return {
          ...place,
          assignedServiceIDs: place.assignedServiceIDs.filter(id => id !== serviceId)
        };
      }
      return place;
    });
    
    this._businessRegistration.next({
      ...current,
      places: places,
      serviceAssignments: updatedAssignments
    });
  }

  // Helper methods for working with the junction table
  getServiceAssignmentsForPlace(placeId: string): BusinessPlaceAndServicesJunction[] {
    const current = this._businessRegistration.value;
    return current.serviceAssignments.filter(sa => sa.placeId === placeId);
  }

  getPlaceAssignmentsForService(serviceId: string): BusinessPlaceAndServicesJunction[] {
    const current = this._businessRegistration.value;
    return current.serviceAssignments.filter(sa => sa.serviceID === serviceId);
  }

  isServiceAssignedToPlace(serviceId: string, placeId: string): boolean {
    const current = this._businessRegistration.value;
    return current.serviceAssignments.some(sa => sa.serviceID === serviceId && sa.placeId === placeId);
  }

  setCurrentStep(step: number) {
    const current = this._businessRegistration.value;
    this._businessRegistration.next({
      ...current,
      currentStep: step
    });
  }

  resetBusinessRegistration() {
    this._businessRegistration.next({
      basicInfo: {} as BusinessBasicInfo,
      services: [],
      places: [],
      serviceAssignments: [],
      currentStep: 0,
      isCompleted: false,
      operationType: 'solo',
      staff: []
    });
  }

  public generateId(): string {
    return 'temp_' + Math.random().toString(36).substr(2, 9);
  }

  // Public getters and setters for state management
  get currentUser(): ServiceFuzzAccount | undefined {
    return this._currentUser.value;
  }

  set currentUser(user: ServiceFuzzAccount | undefined) {
    this._currentUser.next(user);
    
    // Clear stored tokens if user is being cleared
    if (!user) {
      this.clearStoredTokens();
    }
  }

  get jwtToken(): string | undefined {
    return this._jwtToken.value;
  }

  set jwtToken(token: string | undefined) {
    this._jwtToken.next(token);
    // Store regular token in session storage
    if (token) {
      sessionStorage.setItem(this.REGULAR_TOKEN_KEY, token);
      this.scheduleTokenRefresh(token);
    } else {
      sessionStorage.removeItem(this.REGULAR_TOKEN_KEY);
      this.cancelTokenRefresh();
    }
  }

  get signInToken(): string | undefined {
    // Always get the latest value from cookie to ensure consistency
    const cookieToken = this.cookieService.get(this.SIGNIN_TOKEN_COOKIE);
    if (cookieToken && cookieToken !== this._signInToken.value) {
      this._signInToken.next(cookieToken);
    }
    return this._signInToken.value;
  }

  set signInToken(token: string | undefined) {
    this._signInToken.next(token);
    // Store sign-in token in cookie with 2-day expiration
    if (token) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 2); // 2 days expiration
      this.cookieService.set(this.SIGNIN_TOKEN_COOKIE, token, expirationDate, '/', undefined, true, 'Strict');
      console.log('Sign-in token stored in cookie with 2-day expiration');
    } else {
      this.cookieService.delete(this.SIGNIN_TOKEN_COOKIE, '/');
      console.log('Sign-in token cookie cleared');
    }
  }

  // Method to verify instance
  getInstanceId(): number {
    return this.instanceId;
  }

  // Temporary business details storage
  setTempBusinessDetails(business: BusinessRegistrationDto): void {
    this._tempBusinessDetails.next(business);
  }

  getTempBusinessDetails(): BusinessRegistrationDto | null {
    const business = this._tempBusinessDetails.value;
    if (business) {
      // Clear after getting
      this._tempBusinessDetails.next(null);
    }
    return business;
  }

  getUserByID(id: string): Observable<ServiceFuzzAccount> {
    return this.http.get<{ user: ServiceFuzzAccount; token: any }>(
      `${this.apiUrl}/api/User/GetUserById/${id}`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ).pipe(
      map(response => {
        console.log("response", response);
        
        // Extract the user object from the response
        const user = response.user;
        
        // Trim whitespace from user fields
        const cleanUser: ServiceFuzzAccount = {
          ...user,
          email: user.email?.trim() || '',
          name: user.name?.trim() || '',
          userID: user.userID?.trim() || ''
        };
        
        // Extract and set the JWT token
        if (response.token && response.token.result) {
          this.jwtToken = response.token.result;
        }
        
        // Set the cleaned user as current user
        this.currentUser = cleanUser;
        
        console.log("cleaned user", cleanUser);
        console.log("extracted token", this.jwtToken);
        
        return cleanUser;
      })
    );
  }
  GenerateAndSendMagicLinkForLogIn(email: string, customLinkFormat?: string): Observable<{ message: string }> {
    // Get current URL and construct custom link format for new auth system
    const currentUrl = window.location.href;
    const baseUrl = window.location.origin;
    const defaultCustomLinkFormat = `${baseUrl}/auth/callback?signin_token={signInToken}`;
    
    const requestBody = {
      Email: email,  // Note: Backend expects PascalCase
      CustomLinkFormat: customLinkFormat || defaultCustomLinkFormat
    };

    console.log('Magic Link Request Body:', requestBody);
    console.log('Current URL:', currentUrl);

    return this.http.post<{ message: string }>(
        `${this.apiUrl}/api/auth/send-magic-link`,
        requestBody,
        {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ).pipe(
      map(response => {
        return response;
      })
    );
  }
  
  GenerateAndSendMagicLinkForSignUp(email: string, customLinkFormat?: string): Observable<{ message: string }> {
    // Get current URL and construct custom link format for new auth system
    const currentUrl = window.location.href;
    const baseUrl = window.location.origin;
    const defaultCustomLinkFormat = `${baseUrl}/auth/callback?signin_token={signInToken}&source=signup`;
    
    const requestBody = {
      Email: email,  // Note: Backend expects PascalCase
      CustomLinkFormat: customLinkFormat || defaultCustomLinkFormat
    };

    console.log('Signup Magic Link Request Body:', requestBody);
    console.log('Current URL:', currentUrl);

    return this.http.post<{ message: string }>(
        `${this.apiUrl}/api/auth/send-magic-link`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      ).pipe(
        map(response => {
          return response;
        })
      );
  }
  
  verifyGoogleUser(googleToken: string): Observable<{ user: ServiceFuzzAccount; token: string; signInToken: string }> {
    return this.http.post<{ user: ServiceFuzzAccount; token: string; signInToken: string }>(
      `${this.apiUrl}/api/User/VerifyUserViaGoogle/verify-google`,
      JSON.stringify(googleToken), 
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ).pipe(
      map(response => {
        // Store both tokens
        console.log('Google auth response received:', { 
          hasToken: !!response.token, 
          hasSignInToken: !!response.signInToken,
          user: response.user 
        });
        this.jwtToken = response.token;
        this.signInToken = response.signInToken;
        this.currentUser = response.user;
        console.log('Google auth successful - stored both tokens (regular token in session, sign-in token in cookie)');
        return response;
      })
    );
  }

  CreateUserWithGoogleToken(googleToken: string): Observable<{ user: ServiceFuzzAccount; token: string; signInToken: string }> {
    return this.http.post<{ user: ServiceFuzzAccount; token: string; signInToken: string }>(
      `${this.apiUrl}/api/User/CreateUserViaGoogle/create-google`,
      JSON.stringify(googleToken), 
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ).pipe(
      map(response => {
        // Store both tokens
        console.log('Google user creation response received:', { 
          hasToken: !!response.token, 
          hasSignInToken: !!response.signInToken,
          user: response.user 
        });
        this.jwtToken = response.token;
        this.signInToken = response.signInToken;
        this.currentUser = response.user;
        console.log('Google user creation successful - stored both tokens (regular token in session, sign-in token in cookie)');
        return response;
      })
    );
  }

  /**
   * Authenticate using a sign-in token to get a fresh regular token
   */
  authenticateWithSignInToken(signInToken: string): Observable<{ user: ServiceFuzzAccount; token: string; message: string; tokenExpires: string }> {
    return this.http.post<{ user: ServiceFuzzAccount; token: string; message: string; tokenExpires: string }>(
      `${this.apiUrl}/api/auth/authenticate-signin-token`,
      { SignInToken: signInToken },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ).pipe(
      map(response => {
        // Store the new regular token and update user
        this.jwtToken = response.token;
        this.currentUser = response.user;
        console.log('Sign-in token authentication successful - refreshed regular token');
        return response;
      })
    );
  }

  /**
   * Logout user and clear all authentication data
   */
  logout(): Observable<{ message: string }> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // If we have a regular token, include it for logout
    const currentToken = this.jwtToken;
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }

    return this.http.post<{ message: string }>(
      `${this.apiUrl}/api/auth/logout`,
      {},
      { headers }
    ).pipe(
      map(response => {
        // Clear all authentication state
        this.clearState();
        console.log('Logout successful');
        return response;
      })
    );
  }

  getFreeTrialDetailsForUserByEmail(): Observable<ServiceFuzzFreeTrialSubscriptions> {
    if (!this.currentUser?.email) {
      throw new Error('User email is required');
    }
    
    return this.http.get<ServiceFuzzFreeTrialSubscriptions>(
      `${this.apiUrl}/api/User/GetFreeTrialDetails/${this.currentUser.email}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.jwtToken}`
        }
      }
    );
  }

  getBusinessesForUser(ownerEmail: string): Observable<BusinessBasicInfo[]> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.jwtToken}`
    });

    return this.http.get<BusinessBasicInfo[]>(
      `${this.apiUrl}/api/Business/GetBusinessForUser?ownerEmail=${ownerEmail}`,
      { headers }
    );
  }

  // Chat methods
  get messages(): ChatMessage[] {
    return this._chatMessages.value;
  }

  private addMessage(message: ChatMessage) {
    const currentMessages = this._chatMessages.value;
    this._chatMessages.next([...currentMessages, message]);
  }

  clearChatMessages() {
    this._chatMessages.next([]);
    this.openSnackBar('Conversation cleared successfully', 'Close', 3000);
  }

  SendGeminiRequest(request: string): Observable<string> {
    // Add user message to history
    this.addMessage({
      content: request,
      timestamp: new Date(),
      isUser: true
    });

    // Add placeholder for AI response
    const loadingMessage: ChatMessage = {
      content: '',
      timestamp: new Date(),
      isUser: false,
      isLoading: true
    };
    this.addMessage(loadingMessage);

    // Format conversation history
    const conversationHistory = this.messages
      .filter(m => !m.isLoading)
      .map(m => `${m.isUser ? 'User' : 'Assistant'} (${new Date(m.timestamp).toLocaleTimeString()}): ${m.content}`)
      .join('\n');

    // ServiceFuzz context for the AI
    const serviceFuzzContext = `You are a helpful assistant that can answer questions about ServiceFuzz. You must follow these rules strictly:
1. Only answer questions related to ServiceFuzz
2. If a user asks about something unrelated to ServiceFuzz, politely remind them that you can only help with ServiceFuzz-related questions
3. If asked about conversation history or context, provide specific details from the conversation history below
4. Be accurate about the conversation history - if you're not sure about previous messages, say so
5. Never make up or assume previous messages that aren't in the history
6. If the user asks about you name or who you are, your name is Tilda, you are an AI assistant that can answer questions about ServiceFuzz.
7.If the user asks about you model, you cna answer them that it is gemini 2.0 flash.
Here is the background information about ServiceFuzz:
8. You don't have to be so strict with the rules and being on topic, you can be more friendly and helpful and prvide additional information that is not related to servicefuzz!

ServiceFuzz: Revolutionizing Service-Based Businesses

ServiceFuzz is a cutting-edge, comprehensive platform that transforms how service-based businesses operate and connect with their customers. Whether you're running a fitness studio, managing a spa, operating an IT service company, or handling any service-based business, ServiceFuzz provides the complete toolkit you need to succeed in today's digital marketplace.

Our Platform at a Glance:
- Business Management Portal: Streamline your operations with our intuitive dashboard
- Professional Website Builder: Create stunning, mobile-responsive websites in minutes
- Smart Booking System: Handle appointments, memberships, and recurring bookings effortlessly
- Staff Management Suite: Manage your team, track performance, and optimize scheduling
- Integrated Payment Processing: Secure, flexible payment options for all business types
- Comprehensive Analytics: Make data-driven decisions with real-time insights
- Customer Engagement Tools: Build lasting relationships with automated communications
- Mobile-First Design: Manage your business from anywhere, on any device

Built with modern technologies and following industry best practices, ServiceFuzz is constantly evolving to meet the changing needs of service-based businesses. Our platform combines power with simplicity, allowing you to focus on what matters most - delivering exceptional service to your customers.

Join thousands of successful businesses already using ServiceFuzz to streamline their operations, boost customer satisfaction, and drive growth in their service-based businesses.

Previous Conversation History:
${conversationHistory}

Current User Question: ${request}`;
    if(this.messages.length > 50) {
      this.openSnackBar('You have ran out of messages for this conversation, please start a new conversation.', 'Close', 3000);
      throw new Error('I am sorry, I can only answer questions about ServiceFuzz.');
    }
    return this.http.post<any>(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDLtw7CI2uBYCgJqgiBdnFYV4FJ8uQQemo`, {
      "contents": [
        {
          "parts": [
            {
              "text": serviceFuzzContext
            }
          ]
        }
      ]
    }, {}).pipe(
      map(response => {
        // Remove loading message and update messages array
        const messages = this._chatMessages.value.filter(m => !m.isLoading);
        this._chatMessages.next(messages);
        
        // Extract the text from the response structure
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
        
        // Add AI response to history
        this.addMessage({
          content: text,
          timestamp: new Date(),
          isUser: false
        });

        return text;
      })
    );
  }

  generateOptimalScheduleWithAI(businessData: BusinessRegistration): Observable<any> {
    const businessInfo = `
Business Information:
- Name: ${businessData.basicInfo?.bussinessName || 'Unknown Business'}
- Description: ${businessData.basicInfo?.bussinessDescription || 'No description provided'}
- Business Type: Based on description and services

Services Offered:
${businessData.services?.map(service => `
- ${service.serviceName}: ${service.serviceDescription}
  Duration: ${service.duration} minutes
  Price: ${service.servicePrice} ${service.servicePriceCurrencyUnit}`).join('\n') || 'No services defined'}

Current Schedule Count: ${businessData.schedules?.length || 0} schedules already created
`;

    const prompt = `You are an AI business consultant specializing in optimal scheduling for service-based businesses. Based on the business information provided, generate intelligent schedule recommendations that maximize customer accessibility while ensuring efficient operations.

${businessInfo}

Please analyze the business type, services, and industry best practices to recommend optimal operating schedules. Consider:

1. Industry Standards: What are typical operating hours for this type of business?
2. Service Duration: How do service lengths affect scheduling needs?
3. Customer Convenience: When do customers typically need these services?
4. Work-Life Balance: Reasonable hours for business owners and staff
5. Competition: Standard industry practices

Generate 2-3 different schedule options in the following JSON format:

{
  "recommendations": [
    {
      "title": "Standard Business Hours",
      "description": "Traditional weekday schedule ideal for professional services",
      "reasoning": "Brief explanation of why this schedule works for this business type",
      "schedule": {
        "cycleType": 0,
        "cycleLengthInDays": 7,
        "cycles": [
          {
            "days": [
              {
                "day": 1,
                "availabilityStatus": 2,
                "openingPeriods": [
                  {
                    "openingTime": "09:00:00",
                    "closingTime": "17:00:00"
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  ]
}

CRITICAL INSTRUCTIONS:
1. cycleType: Use 0 for Weekly (most common)
2. cycleLengthInDays: Use 7 for weekly schedules
3. day: Use numbers 0-6 (0=Sunday, 1=Monday, 2=Tuesday, etc.)
4. availabilityStatus: Use 2 for SpecificHours (most common), 0 for Open24Hours, 1 for Unavailable
5. Time format: Use "HH:mm:ss" format (e.g., "09:00:00", "17:30:00")
6. Generate realistic schedules based on business type
7. Consider service duration for appointment scheduling
8. Provide 2-3 different options (e.g., standard hours, extended hours, weekend-focused)
9. Include brief reasoning for each recommendation
10. Ensure schedules are practical and customer-friendly

Examples by business type:
- Hair Salon: Tue-Sat, 9 AM-7 PM (closed Sunday-Monday)
- IT Services: Mon-Fri, 8 AM-6 PM (business hours)
- Fitness Studio: Mon-Fri 6 AM-10 PM, Sat-Sun 8 AM-6 PM
- Medical Practice: Mon-Fri 8 AM-5 PM (standard medical hours)
- Restaurant: Tue-Thu 11 AM-9 PM, Fri-Sat 11 AM-10 PM, Sun 11 AM-8 PM (closed Monday)

Make the recommendations specific to the business type and services offered.`;

    return this.http.post<any>(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDLtw7CI2uBYCgJqgiBdnFYV4FJ8uQQemo`, {
      "contents": [
        {
          "parts": [
            {
              "text": prompt
            }
          ]
        }
      ]
    }).pipe(
      map(response => {
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        try {
          // Extract JSON from the response text
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? jsonMatch[0] : '{}';
          const data = JSON.parse(jsonStr);
          
          if (data.recommendations && Array.isArray(data.recommendations)) {
            // Process and validate each recommendation
            data.recommendations = data.recommendations.map((rec: any) => ({
              ...rec,
              schedule: {
                ...rec.schedule,
                                 businessId: businessData.basicInfo?.businessID || '',
                 cycleStartDate: new Date().toISOString(),
                 cycles: rec.schedule.cycles?.map((cycle: any, index: number) => ({
                   businessId: businessData.basicInfo?.businessID || '',
                   cycleId: index + 1,
                   startDate: new Date().toISOString(),
                   endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
                   isActive: true,
                   days: cycle.days?.map((day: any) => ({
                     businessId: businessData.basicInfo?.businessID || '',
                     cycleId: index + 1,
                     day: day.day,
                     availabilityStatus: day.availabilityStatus,
                     openingPeriods: day.openingPeriods?.map((period: any, periodIndex: number) => ({
                       id: periodIndex + 1,
                       businessId: businessData.basicInfo?.businessID || '',
                       cycleId: index + 1,
                       day: day.day,
                       openingTime: period.openingTime,
                       closingTime: period.closingTime
                     })) || []
                   })) || []
                 })) || [],
                exceptions: []
              }
            }));
          }
          
          return data;
        } catch (error) {
          console.error('Error parsing AI schedule response:', error);
          throw new Error('Failed to parse AI schedule recommendations');
        }
      })
    );
  }

  fillBusinessFormWithAI(description: string, currentData?: BusinessRegistration, currentStep?: number): Observable<{
    basicInfo?: BusinessBasicInfo;
    services?: ServicesForBusiness[];
    places?: BusinessPlace[];
    schedules?: any[];
    assignments?: any[];
  }> {
    // Handle step 3 (schedules) separately with the specialized AI method
    if (currentStep === 3) {
      return this.generateOptimalScheduleWithAI(currentData!).pipe(
        map(response => {
          if (response && response.recommendations && Array.isArray(response.recommendations)) {
            // Return the schedules in the expected format
            return {
              schedules: response.recommendations.map((rec: any) => rec.schedule)
            };
          }
          return { schedules: [] };
        })
      );
    }

    const currentFormData = currentData ? `
Current Form Data:
${currentStep === 0 ? `
Basic Info:
- Name: ${currentData.basicInfo.bussinessName || 'Not set'}
- Description: ${currentData.basicInfo.bussinessDescription || 'Not set'}
${currentData.basicInfo.bussinessPhone ? `- Phone: ${currentData.basicInfo.bussinessPhone} (MUST BE KEPT EXACTLY AS IS)` : ''}
${currentData.basicInfo.bussinessEmail ? `- Email: ${currentData.basicInfo.bussinessEmail} (MUST BE KEPT EXACTLY AS IS)` : ''}
${currentData.basicInfo.ownerEmail ? `- Owner Email: ${currentData.basicInfo.ownerEmail} (MUST BE KEPT EXACTLY AS IS)` : ''}` : ''}

${currentStep === 1 ? `
Services:
${currentData.services.map(service => `
- ${service.serviceName} (ID: ${service.serviceID})
  Duration: ${service.duration} minutes
  Price: ${service.servicePrice} ${service.servicePriceCurrencyUnit}
  Description: ${service.serviceDescription}`).join('\n')}` : ''}

${currentStep === 2 ? `
Specific Address Places:
${(currentData as any).specificPlaces?.map((place: any) => `- ${place.streetAdr}, ${place.city}, ${place.state}, ${place.country} (ID: ${place.placeID})`).join('\n') || 'None'}

Area Specification Places:
${(currentData as any).areaPlaces?.map((area: any) => `- ${area.country}, ${area.state}, ${area.city} (ID: ${area.placeID})`).join('\n') || 'None'}` : ''}

${currentStep === 4 ? `
Service Assignment:
Places with Current Assignments:
${currentData.places?.map((place: any) => `- Place: ${place.placeName} (ID: ${place.placeID})
  Current Assigned Services: ${(place.assignedServiceIDs || []).map((id: string) => {
    const service = currentData.services.find((s: any) => s.serviceID === id);
    return service ? `${service.serviceName} (ID: ${service.serviceID})` : id;
  }).join(', ') || 'None'}`).join('\n') || 'None'}

All Available Services:
${currentData.services.map(service => `- ${service.serviceName} (ID: ${service.serviceID})`).join('\n')}

INSTRUCTIONS FOR SERVICE ASSIGNMENT:
- Use the exact Place IDs and Service IDs shown above
- You can assign multiple services to the same place
- You can assign the same service to multiple places
- Services don't disappear when assigned - they remain available for other places` : ''}
` : 'No existing form data.';

    const stepContext = currentStep !== undefined ? `
You are currently editing step ${currentStep + 1} of the form:
${currentStep === 0 ? 'Basic Business Information' : ''}
${currentStep === 1 ? 'Business Services' : ''}
${currentStep === 2 ? 'Business Locations - ADD new locations to existing ones, do not replace existing locations' : ''}
${currentStep === 4 ? 'Service Assignment - Assign services to places using their exact IDs' : ''}

Please only modify the data for the current step.` : '';

    const prompt = `You are an AI assistant helping to fill out a business registration form. Based on the following description and current form data (if any), generate or improve ONLY the business name and description.

${currentStep === 2 ? 'WARNING: If you leave any required field blank for a place, the user will not be able to proceed. You MUST fill EVERY field for every place, even if you have to use a placeholder like "Unknown" or "N/A".' : ''}

${stepContext}

${currentFormData}

User's Description: ${description}

Please provide the response in the following JSON format, but ONLY include the business name and description:
${currentStep === 0 ? `
{
  "basicInfo": {
    "bussinessName": "string",
    "bussinessDescription": "string"
  }
}

CRITICAL INSTRUCTION:
1. You can ONLY modify the business name and description
2. DO NOT include any other fields in your response
3. DO NOT modify any contact information
4. Keep the response focused only on name and description` : ''}
${currentStep === 1 ? `
{
  "services": [
    {
      "serviceName": "string (required, e.g. 'Haircut')",
      "serviceDescription": "string (required, e.g. 'A professional haircut for men and women.')",
      "duration": number (required, in minutes, e.g. 30),
      "servicePrice": number (required, e.g. 25),
      "servicePriceCurrencyUnit": "string (required, e.g. 'USD')",
      "serviceImageUrl": "string (required, a relevant image URL or leave as an empty string if not available)"
    }
  ],
  "deleteServiceIds": ["serviceID1", "serviceID2"]
}

CRITICAL INSTRUCTION:
- You MUST fill in ALL fields for each service.
- Do NOT leave any field blank, null, or as a placeholder.
- Use realistic and appropriate values for each field.
- If you do not have an image URL, use an empty string.
- Example:
{
  "serviceName": "Haircut",
  "serviceDescription": "A professional haircut for men and women.",
  "duration": 30,
  "servicePrice": 25,
  "servicePriceCurrencyUnit": "USD",
  "serviceImageUrl": ""
}` : ''}
${currentStep === 2 ? `
{
  "areaPlaces": [
    {
      "country": "string (required, e.g. 'USA')",
      "state": "string (required, e.g. 'California')",
      "city": "string (required, e.g. 'Los Angeles')",
      "suburbPostcode": "string (required, e.g. '90001')",
      "businessID": "string (required, use '' if not available)",
      "placeID": "string (required, use '' if not available)"
    }
  ],
  "deleteAreaPlaceIds": ["placeID1"],
  "specificPlaces": [
    {
      "streetAdr": "string (required, e.g. '123 Main St')",
      "city": "string (required, e.g. 'Los Angeles')",
      "state": "string (required, e.g. 'California')",
      "country": "string (required, e.g. 'USA')",
      "suburbPostcode": "string (required, e.g. '90001')",
      "businessID": "string (required, use '' if not available)",
      "placeID": "string (required, use '' if not available)"
    }
  ],
  "deleteSpecificPlaceIds": ["placeID2"]
}

CRITICAL INSTRUCTION:
- You MUST fill in ALL fields for each area and specific place.
- Do NOT leave any field blank, null, or as a placeholder.
- Use realistic and appropriate values for each field.
- Example for areaPlaces:
{
  "country": "USA",
  "state": "California",
  "city": "Los Angeles",
  "suburbPostcode": "90001",
  "businessID": "",
  "placeID": ""
}
- Example for specificPlaces:
{
  "streetAdr": "123 Main St",
  "city": "Los Angeles",
  "state": "California",
  "country": "USA",
  "suburbPostcode": "90001",
  "businessID": "",
  "placeID": ""
}` : ''}
${currentStep === 4 ? `
{
  "assignments": [
    { "placeId": "placeID1", "serviceIds": ["serviceID1", "serviceID2"] },
    { "placeId": "placeID2", "serviceIds": ["serviceID3"] }
  ]
}

CRITICAL INSTRUCTIONS FOR SERVICE ASSIGNMENT:
- You MUST include an 'assignments' array to assign services to places
- Use the EXACT Place IDs and Service IDs from the current form data above
- Each assignment object should have: placeId (string) and serviceIds (array of strings)
- You can assign multiple services to one place
- You can assign the same service to multiple places
- If a place should have no services, use an empty serviceIds array: []
- Example: { "placeId": "place123", "serviceIds": ["service456", "service789"] }` : ''}

Make sure to:
1. Only modify the data for the current step
2. If there is existing data for the current step, improve upon it while maintaining consistency
3. Generate realistic and appropriate information
4. Make sure all required fields are filled out
5. Don't overdo it, there shouldn't be that much information and they should be appropriate and realistic
6. For basic info, ONLY modify the business name and description
7. DO NOT modify any contact information
8. If improving existing data, maintain the same style and format while enhancing the content`;

    return this.http.post<any>(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDLtw7CI2uBYCgJqgiBdnFYV4FJ8uQQemo`, {
      "contents": [
        {
          "parts": [
            {
              "text": prompt
            }
          ]
        }
      ]
    }, {}).pipe(
      map(response => {
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        try { 
          // For step 2, expect two JSON objects: one for areaPlaces, one for specificPlaces
          if (currentStep === 2) {
            // Expect a single JSON object
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : '{}';
            const obj = JSON.parse(jsonStr);
            // Filter out incomplete areaPlaces and ADD to existing ones
            let validAreaPlaces = [];
            if (Array.isArray((obj as any).areaPlaces) && currentData) {
              // Only require country for areaPlaces
              validAreaPlaces = (obj as any).areaPlaces.filter((a: any) =>
                a.country
              ).map((a: any) => ({
                ...a,
                placeID: a.placeID || this.generateId(),
                businessID: a.businessID || ''
              }));
              if (validAreaPlaces.length < (obj as any).areaPlaces.length) {
                this.openSnackBar('Some area places were missing required fields and were ignored.', 'Close', 4000);
              }
              // ADD to existing places instead of replacing
              (currentData as any).areaPlaces = [...((currentData as any).areaPlaces || []), ...validAreaPlaces];
            }
            // Filter out incomplete specificPlaces and ADD to existing ones
            let validSpecificPlaces = [];
            if (Array.isArray((obj as any).specificPlaces) && currentData) {
              // Fallback: fill missing fields with 'Unknown' or ''
              (obj as any).specificPlaces = (obj as any).specificPlaces.map((p: any) => ({
                streetAdr: p.streetAdr || 'Unknown',
                city: p.city || 'Unknown',
                state: p.state || 'Unknown',
                country: p.country || 'Unknown',
                suburbPostcode: p.suburbPostcode || '0000',
                businessID: p.businessID !== undefined ? p.businessID : '',
                placeID: p.placeID !== undefined ? p.placeID : this.generateId(),
              }));
              validSpecificPlaces = (obj as any).specificPlaces.filter((p: any) =>
                p.streetAdr && p.city && p.state && p.country && p.suburbPostcode && p.businessID !== undefined && p.placeID !== undefined
              );
              if (validSpecificPlaces.length < (obj as any).specificPlaces.length) {
                this.openSnackBar('Some specific address places were missing required fields and were ignored.', 'Close', 4000);
              }
              // ADD to existing places instead of replacing
              (currentData as any).specificPlaces = [...((currentData as any).specificPlaces || []), ...validSpecificPlaces];
            }
            // Only error if there are no valid places at all
            if (validAreaPlaces.length === 0 && validSpecificPlaces.length === 0) {
              this.openSnackBar('AI must fill in all required fields for at least one place.', 'Close', 4000);
              throw new Error('AI did not fill in all required fields for any place.');
            }
            // Also update currentData.places to match the merged and mapped result
            if (currentData) {
              const allPlaces = [
                ...((currentData as any).specificPlaces || []).map((sp: any) => {
                  const existing = (currentData as any).places?.find((p: any) => p.placeID === sp.placeID);
                  return {
                    placeID: sp.placeID || '',
                    placeName: sp.streetAdr ? `${sp.streetAdr}, ${sp.city}` : 'Specific Place',
                    placeDescription: '',
                    placeAddress: sp.streetAdr || '',
                    placeCity: sp.city || '',
                    placeState: sp.state || '',
                    placeZipCode: sp.suburbPostcode || '',
                    placeCountry: sp.country || '',
                    placePhone: '',
                    placeEmail: '',
                    businessID: sp.businessID || '',
                    isActive: true,
                    assignedServiceIDs: existing ? existing.assignedServiceIDs : [],
                  };
                }),
                ...((currentData as any).areaPlaces || []).map((ap: any) => {
                  const existing = (currentData as any).places?.find((p: any) => p.placeID === ap.placeID);
                  return {
                    placeID: ap.placeID || '',
                    placeName: ap.city ? `${ap.city} Area` : (ap.state ? `${ap.state} Area` : (ap.country || 'Area Place')),
                    placeDescription: '',
                    placeAddress: '',
                    placeCity: ap.city || '',
                    placeState: ap.state || '',
                    placeZipCode: ap.suburbPostcode || '',
                    placeCountry: ap.country || '',
                    placePhone: '',
                    placeEmail: '',
                    businessID: ap.businessID || '',
                    isActive: true,
                    assignedServiceIDs: existing ? existing.assignedServiceIDs : [],
                  };
                })
              ];
              (currentData as any).places = allPlaces;
            }
            return {};
          } else {
            // Extract JSON from the response text
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : '{}';
            const data = JSON.parse(jsonStr);
            
            // For basic info, only take the name and description from AI, preserve everything else
            if (currentStep === 0 && currentData?.basicInfo) {
              data.basicInfo = {
                ...currentData.basicInfo,  // Keep all existing data
                bussinessName: data.basicInfo?.bussinessName || currentData.basicInfo.bussinessName,
                bussinessDescription: data.basicInfo?.bussinessDescription || currentData.basicInfo.bussinessDescription
              };
            }

            // Handle service deletion (step 1)
            if (currentStep === 1 && data.deleteServiceIds && Array.isArray(data.deleteServiceIds)) {
              data.deleteServiceIds.forEach((id: string) => this.removeService(id));
            }

            // Handle place deletion (step 2)
            if (currentStep === 2 && data.deleteSpecificPlaceIds && Array.isArray(data.deleteSpecificPlaceIds)) {
              (currentData as any).specificPlaces = (currentData as any).specificPlaces?.filter((p: any) => !data.deleteSpecificPlaceIds.includes(p.placeID));
            }
            if (currentStep === 2 && data.deleteAreaPlaceIds && Array.isArray(data.deleteAreaPlaceIds)) {
              (currentData as any).areaPlaces = (currentData as any).areaPlaces?.filter((a: any) => !data.deleteAreaPlaceIds.includes(a.placeID));
            }

            // Handle assignments (step 4)
            if (currentStep === 4 && data.assignments && Array.isArray(data.assignments)) {
              // Update registration.places as well as local arrays
              if (currentData && Array.isArray(currentData.places)) {
                currentData.places.forEach((place: any) => {
                  const found = data.assignments.find((a: any) => a.placeId === place.placeID);
                  place.assignedServiceIDs = found ? found.serviceIds : [];
                });
              }
              // Also update local arrays if present
              const allPlaces = [ ...(currentData as any).specificPlaces || [], ...(currentData as any).areaPlaces || [] ];
              allPlaces.forEach((place: any) => {
                const found = data.assignments.find((a: any) => a.placeId === place.placeID);
                place.assignedServiceIDs = found ? found.serviceIds : [];
              });
            }
            
            // For services step, update services array if AI returns new/edited services
            if (currentStep === 1 && Array.isArray(data.services) && currentData) {
              let validServices = data.services
                .filter((s: any) => typeof s === 'object' && s && (s.serviceName && s.serviceName.trim() !== ''))
                .map((s: any) => {
                  return {
                    serviceName: s.serviceName || 'Unnamed Service',
                    serviceDescription: s.serviceDescription || 'No description provided.',
                    serviceID: s.serviceID || this.generateId(),
                    duration: s.duration ?? 30,
                    serviceEstimatedTime: s.serviceEstimatedTime || (s.duration ? `${s.duration} minutes` : '30 minutes'),
                    businessID: s.businessID || '',
                    servicePrice: s.servicePrice === undefined || s.servicePrice === null ? 0 : s.servicePrice,
                    servicePriceCurrencyUnit: s.servicePriceCurrencyUnit || 'USD',
                    serviceImageUrl: s.serviceImageUrl || ''
                  };
                });
              // If no valid services, add a default placeholder
              if (validServices.length === 0) {
                validServices = [{
                  serviceName: 'Unnamed Service',
                  serviceDescription: 'No description provided.',
                  serviceID: this.generateId(),
                  duration: 30,
                  serviceEstimatedTime: '30 minutes',
                  businessID: '',
                  servicePrice: 0,
                  servicePriceCurrencyUnit: 'USD',
                  serviceImageUrl: ''
                }];
              }
              currentData.services = validServices;
            }

            if (data.places) {
              data.places = data.places.map((place: any) => ({
                ...place,
                placeID: this.generateId(),
                businessID: '',
                isActive: true,
                assignedServiceIDs: []
              }));
            }
            this.jsConfetti.addConfetti({
              emojis: ['✨', '✨', '✨', '✨', '✨'],
              confettiRadius: 6,
              confettiNumber: 50,
            });

            return data;
          }
          return {};
        } catch (error) {
          console.error('Error parsing AI response:', error);
          throw new Error('Failed to parse AI response');
        }
      })
    );
  }

  openSnackBar(message: string, action: string, duration: number) {
    this.snackBar.open(message, action, {
      duration: duration,
    });
  }

  clearState(): void {
    this.currentUser = undefined;
    this.jwtToken = undefined;
    this.signInToken = undefined;
    this.freeTrialDetails = undefined;
    this.cancelTokenRefresh();
  }

  // Token Management Methods
  
  /**
   * Initialize authentication state from stored tokens
   */
  private initializeAuthenticationState(): void {
    const storedSignInToken = this.cookieService.get(this.SIGNIN_TOKEN_COOKIE);
    const storedRegularToken = sessionStorage.getItem(this.REGULAR_TOKEN_KEY);
    
    if (storedSignInToken) {
      console.log('Found stored sign-in token in cookie, attempting to restore session');
      this._signInToken.next(storedSignInToken);
      
      // Try to authenticate with the sign-in token to get a fresh regular token
      this.authenticateWithSignInToken(storedSignInToken).subscribe({
        next: (response) => {
          console.log('Successfully restored user session from sign-in token cookie');
          this.openSnackBar('Welcome back! Session restored.', 'Close', 3000);
        },
        error: (error: any) => {
          console.error('Failed to restore user session from sign-in token:', error);
          // Clear invalid tokens
          this.clearStoredTokens();
        }
      });
    } else if (storedRegularToken) {
      // Regular token exists without sign-in token (shouldn't happen in normal flow)
      console.log('Found orphaned regular token, clearing it');
      sessionStorage.removeItem(this.REGULAR_TOKEN_KEY);
    }
  }

  /**
   * Clear all stored authentication tokens
   */
  private clearStoredTokens(): void {
    this.cookieService.delete(this.SIGNIN_TOKEN_COOKIE, '/');
    sessionStorage.removeItem(this.REGULAR_TOKEN_KEY);
    console.log('All stored tokens cleared (cookie and session storage)');
  }

  /**
   * Check if user has a valid session
   */
  public hasUserSession(): boolean {
    return this.cookieService.check(this.SIGNIN_TOKEN_COOKIE);
  }

  /**
   * Schedule automatic token refresh before expiration
   */
  private scheduleTokenRefresh(token: string): void {
    try {
      // Decode JWT to get expiration time
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = exp - now;
      
      // Schedule refresh 5 minutes before expiration, minimum 1 minute
      const refreshTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 60 * 1000);
      
      if (refreshTime > 0) {
        console.log(`Scheduling token refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`);
        this.cancelTokenRefresh(); // Cancel any existing timer
        this.tokenRefreshTimer = setTimeout(() => {
          this.refreshTokenAutomatically();
        }, refreshTime);
      }
    } catch (error) {
      console.error('Error scheduling token refresh:', error);
    }
  }

  /**
   * Cancel scheduled token refresh
   */
  private cancelTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  /**
   * Automatically refresh the regular token using the sign-in token
   */
  private refreshTokenAutomatically(): void {
    const currentSignInToken = this.signInToken;
    
    if (!currentSignInToken) {
      console.warn('No sign-in token available for automatic refresh');
      return;
    }
    
    console.log('Automatically refreshing token');
    this.authenticateWithSignInToken(currentSignInToken).subscribe({
      next: (response) => {
        console.log('Token refreshed automatically');
      },
      error: (error: any) => {
        console.error('Automatic token refresh failed:', error);
        // Clear authentication state on refresh failure
        this.clearState();
      }
    });
  }

  // Confetti Methods
  triggerBasicConfetti() {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
  triggerEmojiConfetti(
    customEmojis?: string[],
    confettiNumber: number = 70,
    emojiSize: number = 2
  ) {
    const defaultEmojis = ['🌈', '⚡️', '💥', '✨', '💫', '🎉', '🥳'];
    const emojisToUse = customEmojis && customEmojis.length > 0
                         ? customEmojis
                         : defaultEmojis;

    this.jsConfetti.addConfetti({
      emojis: emojisToUse,
      confettiNumber: confettiNumber, // Total number of confetti particles
      emojiSize: emojiSize,         // Size of each emoji in pixels
    });
  }

  triggerSuccessConfetti() {
    const end = Date.now() + 1000;

    const colors = ['#00ff00', '#4CAF50', '#45D1FD'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }

  triggerCelebrationConfetti() {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti(Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      }));
      confetti(Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      }));
    }, 250);
  }
 

  triggerFireworks() {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    let skew = 1;

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    (function frame() {
      const timeLeft = animationEnd - Date.now();
      const ticks = Math.max(200, 500 * (timeLeft / duration));
      skew = Math.max(0.8, skew - 0.001);

      confetti({
        particleCount: 1,
        startVelocity: 0,
        ticks: ticks,
        origin: {
          x: Math.random(),
          y: (Math.random() * skew) - 0.2
        },
        colors: ['#FF0000', '#FFA500', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#EE82EE'],
        shapes: ['circle'],
        gravity: randomInRange(0.4, 0.6),
        scalar: randomInRange(0.8, 1.2),
        drift: randomInRange(-0.4, 0.4)
      });

      if (timeLeft > 0) {
        requestAnimationFrame(frame);
      }
    }());
  }
} 