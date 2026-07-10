const letters = ['A', 'B', 'C', 'D'];

function segment(id, voice, text) {
  return { id, voice, text };
}

function part1(id, image, statements, answer, explanation, voice = 'woman-us') {
  return {
    id,
    image,
    answer,
    explanation,
    tags: ['photograph'],
    segments: [
      segment(`${id}-n`, 'narrator', 'Look at the picture.'),
      ...statements.map((text, index) => segment(`${id}-${letters[index].toLowerCase()}`, voice, `${letters[index]}. ${text}`)),
    ],
  };
}

function part2(id, prompt, responses, answer, explanation, voices = ['man-us', 'woman-au']) {
  return {
    id,
    answer,
    explanation,
    tags: ['question-response'],
    segments: [
      segment(`${id}-q`, voices[0], prompt),
      ...responses.map((text, index) => segment(`${id}-${letters[index].toLowerCase()}`, voices[1], `${letters[index]}. ${text}`)),
    ],
  };
}

function set(id, part, lines, questions, tags) {
  return {
    id,
    tags,
    segments: [
      segment(`${id}-n`, 'narrator', part === 3
        ? 'Listen to the following conversation.'
        : 'Listen to the following talk.'),
      ...lines.map(([voice, text], index) => segment(`${id}-${index + 1}`, voice, text)),
    ],
    questions: questions.map(([prompt, options, answer, explanation], index) => ({
      id: `${id}-q${index + 1}`,
      prompt,
      options: Object.fromEntries(options.map((text, optionIndex) => [letters[optionIndex], text])),
      answer,
      explanation,
      tags: [part === 3 ? 'conversation' : 'talk', ...tags],
    })),
  };
}

export const test2ListeningContent = {
  title: 'English Listening — Test 2',
  format: 'TOEIC Listening (Parts 1–4)',
  parts: {
    part1: { items: [
      part1('l1-101', 'l1-101-photo.jpg', ['A worker is stacking some towels.', 'A shelf is being taken apart.', 'A woman is closing the curtains.', 'Some clothes are hanging by a window.'], 'A', 'The worker is placing folded towels on the shelves.'),
      part1('l1-102', 'l1-102-photo.jpg', ['Some people are watering a plant.', 'Two people are carrying a potted plant.', 'A hallway is being painted.', 'A man is opening a glass door.'], 'B', 'Two office workers are carrying a large potted plant.', 'man-uk'),
      part1('l1-103', 'l1-103-photo.jpg', ['The bicycles are being loaded onto a vehicle.', 'A customer is paying at a counter.', 'A mechanic is working on a bicycle wheel.', 'Some tools have been packed into a case.'], 'C', 'The mechanic is adjusting the front wheel of a bicycle.', 'woman-au'),
      part1('l1-104', 'l1-104-photo.jpg', ['Customers are ordering food outdoors.', 'Some chairs are stacked beside a wall.', 'A patio is being swept.', 'A worker is setting tables on a patio.'], 'D', 'The restaurant worker is putting dishes and glasses on outdoor tables.', 'man-us'),
      part1('l1-105', 'l1-105-photo.jpg', ['A worker is scanning a box.', 'Some shelves are being assembled.', 'A package has fallen onto the floor.', 'The boxes are being carried outside.'], 'A', 'The warehouse worker is using a handheld scanner on a box.', 'woman-us'),
      part1('l1-106', 'l1-106-photo.jpg', ['Visitors are sitting on some benches.', 'A groundskeeper is trimming a hedge.', 'A path is covered with leaves.', 'Some trees are being planted.'], 'B', 'A groundskeeper is trimming the hedge behind several benches.', 'man-uk'),
    ] },
    part2: { items: [
      part2('l2-101', 'When will the revised schedule be posted?', ['By the elevators.', 'Probably this afternoon.', 'It lists every department.'], 'B', '“This afternoon” directly answers when.'),
      part2('l2-102', 'Could you reserve the small conference room?', ['Sure, what time do you need it?', 'The conference was informative.', 'There are twelve chairs.'], 'A', 'The speaker agrees and asks for the reservation time.', ['woman-au', 'man-us']),
      part2('l2-103', 'Who approved the advertising budget?', ['It was more than expected.', 'For the spring campaign.', 'Ms. Patel signed off on it.'], 'C', 'Ms. Patel answers who approved it.', ['man-uk', 'woman-us']),
      part2('l2-104', 'Why is the loading dock closed?', ['A delivery truck is being unloaded.', 'At the rear entrance.', 'It closes at six.'], 'A', 'The unloading activity explains why it is closed.'),
      part2('l2-105', 'You have met our new accountant, haven’t you?', ['No, not yet.', 'The account is overdue.', 'Yes, I can count them.'], 'A', '“No, not yet” naturally responds to the confirmation question.', ['woman-us', 'man-uk']),
      part2('l2-106', 'Where should I leave these invoices?', ['They were paid yesterday.', 'On my desk is fine.', 'About twenty copies.'], 'B', 'The desk is a location.'),
      part2('l2-107', 'How often is the safety equipment inspected?', ['Twice a year.', 'By a certified technician.', 'In the storage area.'], 'A', '“Twice a year” gives a frequency.', ['man-us', 'woman-us']),
      part2('l2-108', 'Would you prefer the morning train or the afternoon one?', ['The station is nearby.', 'A round-trip ticket.', 'The earlier one, please.'], 'C', '“The earlier one” selects the morning train.', ['woman-au', 'man-uk']),
      part2('l2-109', 'Didn’t Marcus send the client the updated proposal?', ['I’ll check with him.', 'The update took an hour.', 'A new client database.'], 'A', 'Checking with Marcus is a natural response when the speaker is uncertain.'),
      part2('l2-110', 'How did the product demonstration go?', ['In the main showroom.', 'Very well, thanks.', 'With a remote control.'], 'B', '“Very well” describes how the demonstration went.', ['man-uk', 'woman-au']),
      part2('l2-111', 'Which printer can handle larger paper?', ['The one beside the supply cabinet.', 'I printed fifty pages.', 'The paper was recycled.'], 'A', 'The response identifies a particular printer.'),
      part2('l2-112', 'Why don’t we ask for a later checkout time?', ['I already called the front desk.', 'The receipt is in my bag.', 'Our rooms are on the fifth floor.'], 'A', 'The response indicates the suggestion has already been acted on.', ['woman-us', 'man-us']),
      part2('l2-113', 'Can I get you anything from the cafeteria?', ['It opens at eleven.', 'A cup of tea would be nice.', 'The tables were cleaned.'], 'B', 'The speaker requests a cup of tea.'),
      part2('l2-114', 'Where was the orientation session held?', ['Last Monday morning.', 'The human resources team.', 'In the training center.'], 'C', 'The training center is a place.', ['man-us', 'woman-au']),
      part2('l2-115', 'You’ll submit the expense report today, right?', ['Yes, after I attach the receipts.', 'The trip was expensive.', 'There are three reports.'], 'A', 'The speaker confirms and explains what remains to be done.'),
      part2('l2-116', 'Whose umbrella is by the reception desk?', ['It might belong to Elena.', 'Because it started raining.', 'Next to the front door.'], 'A', 'Elena answers whose umbrella it may be.', ['woman-au', 'man-uk']),
      part2('l2-117', 'Should we replace the lobby chairs this month?', ['They seat six people.', 'Let’s wait for the renovation plan.', 'The lobby is downstairs.'], 'B', 'Waiting for the plan directly responds to the suggestion.'),
      part2('l2-118', 'When did the maintenance crew arrive?', ['Just before noon.', 'To repair the elevator.', 'They used the side entrance.'], 'A', '“Just before noon” gives a time.', ['man-uk', 'woman-us']),
      part2('l2-119', 'Couldn’t we ship the samples by express mail?', ['That would cost too much.', 'The samples look good.', 'Here is the mailing address.'], 'A', 'The cost explains why the proposed method may not be suitable.'),
      part2('l2-120', 'What do you think of the new menu design?', ['The chef starts at noon.', 'It looks much easier to read.', 'Two vegetarian meals.'], 'B', 'The response gives an opinion about the design.', ['woman-us', 'man-us']),
      part2('l2-121', 'Who is leading tomorrow’s workshop?', ['It lasts about two hours.', 'Mr. Ochoa from the sales team.', 'In Workshop Room B.'], 'B', 'Mr. Ochoa answers who is leading.'),
      part2('l2-122', 'Do you know whether the package has arrived?', ['I’ll look in the delivery log.', 'A medium-sized box.', 'The courier charges ten dollars.'], 'A', 'The delivery log can confirm whether it arrived.', ['man-us', 'woman-au']),
      part2('l2-123', 'Why was the outdoor concert postponed?', ['Tickets are still available.', 'The stage is quite large.', 'Heavy rain is expected.'], 'C', 'Expected rain explains the postponement.'),
      part2('l2-124', 'How many applicants are we interviewing?', ['Four this morning.', 'At the regional office.', 'The position is advertised online.'], 'A', '“Four” answers how many.', ['woman-au', 'man-uk']),
      part2('l2-125', 'The copy machine needs more toner.', ['I ordered some yesterday.', 'Those copies are mine.', 'It is across from the stairs.'], 'A', 'Ordering toner addresses the stated need.'),
    ] },
    part3: { sets: [
      set('l3-101', 3, [['woman-us', 'The caterer needs our final guest count by three o’clock.'], ['man-us', 'We have forty-two confirmations, but the design team has not replied.'], ['woman-us', 'I’ll call their manager now. Please send the current number to the caterer and mention that it may increase.']], [
        ['What are the speakers organizing?', ['A training class', 'A catered event', 'A product shipment', 'A job interview'], 'B', 'They discuss a caterer and guest count.'],
        ['What problem do the speakers mention?', ['A team has not responded', 'The menu is too expensive', 'The venue has changed', 'Invitations were printed incorrectly'], 'A', 'The design team has not replied.'],
        ['What will the woman probably do next?', ['Contact a manager', 'Cancel the catering order', 'Count some chairs', 'Print invitations'], 'A', 'She says she will call the design team’s manager.'],
      ], ['events']),
      set('l3-102', 3, [['man-uk', 'I’m here to pick up the rental car, but the counter says my reservation is for tomorrow.'], ['woman-au', 'Let me check your confirmation email. Ah, the date is correct here. I’ll speak with the supervisor.'], ['man-uk', 'Thanks. I have to reach a client’s factory by ten.']], [
        ['Where most likely are the speakers?', ['At a car rental office', 'At a factory', 'At a repair garage', 'At a train station'], 'A', 'They discuss picking up a rental car.'],
        ['What discrepancy is mentioned?', ['The vehicle category', 'The rental price', 'The reservation date', 'The return location'], 'C', 'The counter has the reservation for the wrong day.'],
        ['Why is the man in a hurry?', ['He has a client appointment', 'His flight is boarding', 'The office is closing', 'He must return a vehicle'], 'A', 'He must reach a client’s factory by ten.'],
      ], ['travel']),
      set('l3-103', 3, [['woman-au', 'The east display window looks empty since we sold the blue sofa.'], ['man-us', 'The new dining set arrives this afternoon. We could feature it there.'], ['woman-au', 'Good idea. I’ll move the floor lamps first so the delivery crew has room.']], [
        ['Where do the speakers probably work?', ['At a furniture store', 'At a lighting factory', 'At a moving company', 'At a restaurant'], 'A', 'They discuss displaying a sofa and dining set.'],
        ['What will arrive this afternoon?', ['A blue sofa', 'Some floor lamps', 'A dining set', 'A display window'], 'C', 'The man says the new dining set arrives this afternoon.'],
        ['What will the woman do first?', ['Call a customer', 'Move some lamps', 'Clean a sofa', 'Meet the delivery driver'], 'B', 'She says she will move the floor lamps first.'],
      ], ['retail']),
      set('l3-104', 3, [['man-us', 'The monthly report shows unusually high electricity use on the third floor.'], ['woman-us', 'That floor’s lights were left on during the holiday weekend. The automatic timer failed.'], ['man-us', 'Please ask Facilities to replace it and check the other timers too.']], [
        ['What are the speakers reviewing?', ['An energy report', 'A holiday schedule', 'A repair invoice', 'A floor plan'], 'A', 'They are discussing a report about electricity use.'],
        ['What caused the problem?', ['A broken window', 'A failed light timer', 'New office equipment', 'Weekend construction'], 'B', 'The automatic timer failed.'],
        ['What does the man request?', ['Close the third floor', 'Change a work schedule', 'Contact Facilities', 'Lower the monthly budget'], 'C', 'He asks the woman to contact Facilities.'],
      ], ['facilities']),
      set('l3-105', 3, [['woman-us', 'Mr. Chen, your two-thirty appointment has arrived early.'], ['man-uk', 'I’m still on a call with the supplier. Could you offer her some coffee and the annual report?'], ['woman-us', 'Of course. I’ll let her know you’ll be available in about ten minutes.']], [
        ['Who most likely is the woman?', ['A receptionist', 'A supplier', 'An accountant', 'A tour guide'], 'A', 'She announces the arrival of an appointment and will assist the visitor.'],
        ['Why can the man not meet the visitor immediately?', ['He is reviewing a report', 'He is on another call', 'He is making coffee', 'He is out of the office'], 'B', 'He says he is still on a supplier call.'],
        ['What will the visitor receive?', ['A price list', 'A visitor badge', 'An annual report', 'A meeting agenda'], 'C', 'The man asks that she be offered the annual report.'],
      ], ['office']),
      set('l3-106', 3, [['man-us', 'This jacket fits well, but I need it for a conference on Friday.'], ['woman-au', 'The sleeves need shortening. Our tailor can finish by Thursday afternoon for a small rush fee.'], ['man-us', 'That works. Please go ahead with the alteration.']], [
        ['What does the man need the jacket for?', ['A conference', 'A wedding', 'A job interview', 'A store display'], 'A', 'He says he needs it for a conference.'],
        ['What adjustment is required?', ['Replacing a button', 'Shortening the sleeves', 'Changing the collar', 'Cleaning the fabric'], 'B', 'The woman says the sleeves need shortening.'],
        ['What does the man agree to do?', ['Buy another jacket', 'Return on Friday', 'Pay for faster service', 'Contact the tailor himself'], 'C', 'He accepts completion by Thursday with a rush fee.'],
      ], ['retail']),
      set('l3-107', 3, [['woman-au', 'The community center asked whether we can donate laptops for its evening classes.'], ['man-uk', 'We have eight older models in storage, but Information Technology must erase the data first.'], ['woman-au', 'I’ll submit a service request today and arrange delivery once they’re ready.']], [
        ['What has the community center requested?', ['Volunteer instructors', 'Laptop computers', 'Classroom furniture', 'Technical manuals'], 'B', 'It asked for laptop donations.'],
        ['What must happen before the items are donated?', ['Their data must be erased', 'Their batteries must be replaced', 'A class must be scheduled', 'A manager must buy them'], 'A', 'IT must erase the data.'],
        ['What will the woman do today?', ['Teach an evening class', 'Visit the storage room', 'Submit a service request', 'Deliver the computers'], 'C', 'She says she will submit a request today.'],
      ], ['technology']),
      set('l3-108', 3, [['man-uk', 'The bakery delivered only six trays of sandwiches, but our order says eight.'], ['woman-us', 'I’ll photograph the delivery slip and call them. The luncheon starts in an hour.'], ['man-uk', 'Ask whether they can send the missing trays with their next driver.']], [
        ['What problem do the speakers discuss?', ['A late luncheon', 'An incomplete food delivery', 'A damaged camera', 'An incorrect invoice total'], 'B', 'Two sandwich trays are missing.'],
        ['What will the woman photograph?', ['The sandwiches', 'The luncheon room', 'A delivery slip', 'A driver’s vehicle'], 'C', 'She says she will photograph the delivery slip.'],
        ['What does the man suggest?', ['Changing the menu', 'Postponing the luncheon', 'Picking up the order', 'Using the next delivery driver'], 'D', 'He asks that the missing trays come with the next driver.'],
      ], ['food-service']),
      set('l3-109', 3, [['woman-us', 'The website’s registration page is loading slowly again.'], ['man-us', 'Traffic increased after this morning’s newsletter. I can add server capacity within twenty minutes.'], ['woman-us', 'Please do. I’ll post a message asking customers to try again shortly.']], [
        ['What issue are the speakers discussing?', ['A slow webpage', 'An incorrect newsletter', 'A missing registration form', 'A customer password'], 'A', 'The registration page is loading slowly.'],
        ['What caused the issue?', ['A software update', 'Increased visitor traffic', 'A power failure', 'An expired account'], 'B', 'Traffic increased after the newsletter.'],
        ['What will the man do?', ['Rewrite the newsletter', 'Call customers', 'Increase server capacity', 'Close registration'], 'C', 'He offers to add server capacity.'],
      ], ['technology']),
      set('l3-110', 3, [['man-us', 'I reserved a projector for Room 204, but it isn’t in the equipment cabinet.'], ['woman-au', 'Professor Lane borrowed it this morning. Her seminar should finish at one-fifteen.'], ['man-us', 'My presentation starts at one-thirty, so I’ll collect it from her room.']], [
        ['What item is the man looking for?', ['A cabinet key', 'A projector', 'A laptop charger', 'A room schedule'], 'B', 'He says he reserved a projector.'],
        ['Who currently has the item?', ['Professor Lane', 'A cabinet manager', 'A seminar guest', 'The woman'], 'A', 'Professor Lane borrowed it.'],
        ['What will the man probably do?', ['Move his presentation', 'Purchase new equipment', 'Go to another room', 'Start the seminar early'], 'C', 'He will collect it from Professor Lane’s room.'],
      ], ['equipment']),
      set('l3-111', 3, [['woman-au', 'The museum tour is full, but two visitors just canceled.'], ['man-uk', 'Great. The couple waiting near the entrance asked about openings.'], ['woman-au', 'I’ll add their names and give them audio headsets before the group leaves.']], [
        ['Where most likely are the speakers?', ['At a museum', 'At a hotel', 'At a theater', 'At a library'], 'A', 'They discuss a museum tour and audio headsets.'],
        ['What has just happened?', ['A tour guide arrived', 'Two spaces became available', 'Some headsets were lost', 'A group left early'], 'B', 'Two visitors canceled, creating openings.'],
        ['What will the woman give to a couple?', ['Entrance maps', 'Refund forms', 'Audio headsets', 'Name badges'], 'C', 'She says she will give them audio headsets.'],
      ], ['tourism']),
      set('l3-112', 3, [['man-uk', 'The sample tiles arrived. Should we put the gray ones in the lobby mock-up?'], ['woman-us', 'The client preferred the lighter color during yesterday’s review.'], ['man-uk', 'Right. I’ll replace these and update the materials list before our next meeting.']], [
        ['What are the speakers working on?', ['An interior design project', 'A shipping schedule', 'A sales brochure', 'A building inspection'], 'A', 'They discuss tile samples, a lobby mock-up, and a client.'],
        ['What did the client prefer?', ['A smaller tile', 'A lighter color', 'A gray wall', 'A shorter meeting'], 'B', 'The woman says the client preferred the lighter color.'],
        ['What will the man update?', ['A delivery address', 'A room diagram', 'A materials list', 'A client contract'], 'C', 'He says he will update the materials list.'],
      ], ['design']),
      set('l3-113', 3, [['woman-us', 'I noticed the invoice includes overnight shipping, but we requested standard delivery.'], ['man-us', 'You’re right. I’ll ask the vendor for a corrected invoice before Accounting processes it.'], ['woman-us', 'Please copy me on the message so I can update the project costs.']], [
        ['What error was found?', ['The quantity is incorrect', 'The wrong shipping service was charged', 'The project code is missing', 'The invoice was sent twice'], 'B', 'The invoice charges overnight instead of standard shipping.'],
        ['Who will the man contact?', ['The vendor', 'A delivery driver', 'The project manager', 'An accountant'], 'A', 'He will ask the vendor for a corrected invoice.'],
        ['Why does the woman want a copy of the message?', ['To approve the payment', 'To change the delivery date', 'To update project costs', 'To order more supplies'], 'C', 'She explicitly says she needs to update project costs.'],
      ], ['finance']),
    ] },
    part4: { sets: [
      set('l4-101', 4, [['woman-us', 'Attention shoppers. The home-goods department on the second floor will close at six this evening for inventory counting. All other departments will remain open until nine. Customers who need assistance with an item from home goods should speak with an associate before six.']], [
        ['What is the purpose of the announcement?', ['To advertise a sale', 'To announce an early department closing', 'To explain a return policy', 'To recruit store employees'], 'B', 'It announces that one department will close early.'],
        ['Why will the department close?', ['For inventory counting', 'For staff training', 'For floor repairs', 'For a private event'], 'A', 'It will close for inventory counting.'],
        ['What are listeners advised to do?', ['Leave the store by six', 'Shop on the first floor', 'Speak with an associate before six', 'Return their purchases tomorrow'], 'C', 'Customers needing help in that department should speak with an associate before six.'],
      ], ['retail']),
      set('l4-102', 4, [['man-uk', 'Welcome to the Riverside Business Center. Before we begin today’s networking breakfast, please write your name and company on the badge in your welcome packet. Coffee is available beside the windows, and the first presentation will begin in the auditorium at eight forty-five.']], [
        ['Who most likely are the listeners?', ['Business event attendees', 'Restaurant employees', 'Hotel maintenance workers', 'University applicants'], 'A', 'They are attending a networking breakfast at a business center.'],
        ['What should listeners write on a badge?', ['A meal preference', 'A seat number', 'Their name and company', 'A presentation title'], 'C', 'The speaker asks for their name and company.'],
        ['What will happen at eight forty-five?', ['Coffee service will end', 'A presentation will begin', 'The auditorium will close', 'Packets will be distributed'], 'B', 'The first presentation begins then.'],
      ], ['events']),
      set('l4-103', 4, [['woman-au', 'This is a message for passengers traveling on Flight 628 to Wellington. Boarding will take place at Gate 14 instead of Gate 9 because of maintenance in the west concourse. The departure time is unchanged. Please check the monitors for walking directions to the new gate.']], [
        ['What change is announced?', ['A new flight number', 'A different boarding gate', 'A later departure time', 'A change of destination'], 'B', 'The boarding gate has changed.'],
        ['Why was the change made?', ['Because of maintenance work', 'Because of bad weather', 'Because the aircraft is full', 'Because a crew is late'], 'A', 'Maintenance in the west concourse caused the change.'],
        ['What are passengers asked to check?', ['Their passports', 'Their boarding passes', 'Airport monitors', 'Their baggage tags'], 'C', 'They should check monitors for walking directions.'],
      ], ['travel']),
      set('l4-104', 4, [['man-us', 'Hello, this is Daniel from Northside Appliance Repair calling about your refrigerator. The replacement motor arrived this morning, so our technician can come Wednesday between one and three. Please call us before five today if that time is not convenient.']], [
        ['Why is the speaker calling?', ['To sell a refrigerator', 'To schedule a repair visit', 'To request a payment', 'To confirm a delivery address'], 'B', 'He is arranging a technician visit after a part arrived.'],
        ['What arrived this morning?', ['A new refrigerator', 'A technician’s schedule', 'A replacement motor', 'A customer payment'], 'C', 'The replacement motor arrived.'],
        ['When should the listener call if necessary?', ['Before five today', 'Wednesday morning', 'Between one and three', 'After the repair'], 'A', 'The speaker requests a call before five today.'],
      ], ['service']),
      set('l4-105', 4, [['woman-us', 'Thank you for joining the library’s digital research workshop. Today we’ll practice searching the newspaper archive and saving articles to a personal folder. Computers are available at every seat. If you do not already have a library account, raise your hand and a staff member will create one for you.']], [
        ['What will participants practice?', ['Repairing computers', 'Searching a newspaper archive', 'Writing news articles', 'Organizing library shelves'], 'B', 'The workshop covers searching the archive.'],
        ['What is available at every seat?', ['A newspaper', 'A personal folder', 'A computer', 'An account form'], 'C', 'Computers are available at every seat.'],
        ['Who should raise a hand?', ['People without a library account', 'People who brought a computer', 'Staff members', 'Newspaper reporters'], 'A', 'Those without accounts should raise their hands.'],
      ], ['training']),
      set('l4-106', 4, [['man-us', 'Here is your morning traffic update. Roadwork has closed the right lane of Harbor Avenue between Pine Street and the ferry terminal. Drivers should use Coastal Road instead. Bus route 12 will follow its normal schedule but may experience delays of up to fifteen minutes.']], [
        ['What is causing a traffic problem?', ['A ferry cancellation', 'Road construction', 'A bus accident', 'Heavy rain'], 'B', 'Roadwork has closed a lane.'],
        ['What alternate route is recommended?', ['Pine Street', 'Route 12', 'Coastal Road', 'Harbor Bridge'], 'C', 'Drivers are advised to use Coastal Road.'],
        ['What is said about bus route 12?', ['It has been canceled', 'It will use a new terminal', 'It may be delayed', 'It runs every fifteen minutes'], 'C', 'The route may experience delays.'],
      ], ['transportation']),
      set('l4-107', 4, [['woman-au', 'On behalf of Greenway Consulting, I’d like to congratulate this quarter’s service award recipient, Luis Romero. Several clients specifically praised his clear project updates and quick responses. Luis will receive an extra vacation day and a certificate at Friday’s staff luncheon.']], [
        ['What is the speaker announcing?', ['A new client project', 'An employee award', 'A vacation policy', 'A consulting service'], 'B', 'She announces a service award recipient.'],
        ['Why was Luis praised?', ['He recruited several clients', 'He planned a luncheon', 'He communicated clearly and quickly', 'He completed a project early'], 'C', 'Clients praised his updates and responses.'],
        ['What will Luis receive?', ['A business trip', 'A salary increase', 'An extra vacation day', 'A new office'], 'C', 'He will receive an extra vacation day and certificate.'],
      ], ['office']),
      set('l4-108', 4, [['man-uk', 'Before operating the floor-polishing machine, inspect the power cord for damage and place warning signs at both ends of the hallway. Never leave the machine running unattended. When you finish, empty the water tank and return the machine to the first-floor storage closet.']], [
        ['What kind of instructions are being given?', ['Equipment safety instructions', 'Delivery instructions', 'Customer service instructions', 'Building evacuation instructions'], 'A', 'The talk explains safe operation of a polishing machine.'],
        ['What should be placed in the hallway?', ['Power cords', 'Water tanks', 'Warning signs', 'Storage boxes'], 'C', 'Warning signs should be placed at both ends.'],
        ['What should listeners do after using the machine?', ['Call a supervisor', 'Empty its water tank', 'Repair the power cord', 'Leave it in the hallway'], 'B', 'They are instructed to empty the tank.'],
      ], ['safety']),
      set('l4-109', 4, [['woman-us', 'You’ve reached the voicemail of Priya Nair in Purchasing. I’ll be visiting suppliers from August fourth through August sixth and will have limited access to email. For urgent purchase-order questions, contact my assistant, Leo Grant, at extension 308. I’ll return all other messages on Thursday.']], [
        ['Why will the speaker be unavailable?', ['She is attending training', 'She is visiting suppliers', 'She is taking a vacation', 'She is moving offices'], 'B', 'She will be visiting suppliers.'],
        ['Who should be contacted about an urgent matter?', ['Priya Nair', 'A supplier', 'Leo Grant', 'An email administrator'], 'C', 'Urgent purchase-order questions should go to Leo Grant.'],
        ['When will the speaker return other messages?', ['August fourth', 'August sixth', 'On Wednesday', 'On Thursday'], 'D', 'She says she will return other messages Thursday.'],
      ], ['purchasing']),
      set('l4-110', 4, [['man-us', 'Thanks for downloading the CityCycle mobile application. To unlock a bicycle, scan the code above the rear wheel and wait for the green light. Your first thirty minutes are included in the daily fee. To end your rental, return the bicycle to any marked station and push it firmly into an open dock.']], [
        ['What is being explained?', ['How to rent a bicycle', 'How to repair a mobile phone', 'How to apply for a driving permit', 'How to find a bus route'], 'A', 'The speaker explains unlocking and returning a rental bicycle.'],
        ['What should users scan?', ['A station map', 'A payment receipt', 'A code above the rear wheel', 'A green light'], 'C', 'They should scan the code above the rear wheel.'],
        ['How do users end a rental?', ['By calling customer service', 'By returning the bicycle to a marked station', 'By paying an additional daily fee', 'By turning off the application'], 'B', 'They must dock the bicycle at a marked station.'],
      ], ['transportation']),
    ] },
  },
};

function readingSet(id, type, text, questions) {
  return {
    id,
    passages: [{ type, text }],
    questions: questions.map(([prompt, options, answer, explanation, tags], index) => ({
      id: `${id}-q${index + 1}`,
      prompt,
      options: Object.fromEntries(options.map((option, optionIndex) => [letters[optionIndex], option])),
      answer,
      explanation,
      tags,
    })),
  };
}

export const test2ReadingSingleSets = [
  readingSet('p7-s21', 'e-mail', 'To: All Laboratory Staff\nFrom: Mina Cho, Operations Manager\nSubject: Freezer maintenance\n\nTechnicians will inspect the two specimen freezers in Room 3B on Tuesday, May 14, beginning at 8:00 A.M. Before leaving on Monday, transfer all labeled samples to the temporary freezer in Room 3D. A cart and insulated containers will be placed outside Room 3B after lunch. The inspection should be completed by noon Tuesday. Do not return samples until the temperature display on each freezer reads minus 20 degrees Celsius for at least thirty minutes. Contact me if you need help moving unusually large containers.', [
    ['Why was the e-mail sent?', ['To announce equipment maintenance', 'To request new laboratory labels', 'To report damaged samples', 'To change an inspection company'], 'A', 'The message announces freezer inspection and preparation.', ['purpose']],
    ['What are staff instructed to do on Monday?', ['Meet a technician', 'Move labeled samples', 'Clean Room 3D', 'Order insulated containers'], 'B', 'They must transfer samples before leaving Monday.', ['detail']],
    ['When may samples be returned?', ['Immediately after noon', 'After a manager checks their labels', 'After the required temperature remains stable', 'When the cart is removed'], 'C', 'The freezers must remain at minus 20 degrees for thirty minutes.', ['inference']],
  ]),
  readingSet('p7-s22', 'notice', 'WEST HARBOR COMMUNITY THEATER\nVolunteer Costume Assistants Needed\n\nWe are seeking four volunteers to help prepare costumes for our summer production. Duties include organizing garments by scene, making simple repairs, and helping performers during dress rehearsals. Sewing experience is useful but not required; our costume director will provide training on June 8. Volunteers must be available for evening rehearsals from June 18 through June 21 and for both performances on June 22. To apply, complete the volunteer form at the theater office by May 30. Applicants will receive confirmation by e-mail during the first week of June.', [
    ['What is indicated about the volunteer positions?', ['They are for a winter production', 'They include training', 'They require professional sewing experience', 'They are limited to theater members'], 'B', 'The costume director will provide training.', ['detail']],
    ['What must volunteers be able to do?', ['Attend evening rehearsals', 'Design the stage scenery', 'Purchase their own tools', 'Work every day in June'], 'A', 'Evening availability from June 18 through 21 is required.', ['detail']],
  ]),
  readingSet('p7-s23', 'article', 'Local manufacturer Bellford Instruments has completed an expansion of its Lakeside facility. The 1,200-square-meter addition contains a testing laboratory and a larger employee training center. According to plant director Olivia Mensah, the additional laboratory space will allow new products to be evaluated on site instead of being sent to an outside company. Construction began last September and was originally expected to finish in March, but unusually cold weather delayed exterior work for three weeks. The company will hold guided tours of the new area for employees and their families on Saturday, April 27.', [
    ['What is a benefit of the expanded facility?', ['Products can be tested on site', 'Construction costs will decrease', 'Employees can work remotely', 'Outside companies can rent space'], 'A', 'The new lab allows on-site evaluation.', ['detail']],
    ['Why was construction delayed?', ['A permit was missing', 'Equipment arrived late', 'The weather was unusually cold', 'The design was changed'], 'C', 'Cold weather delayed exterior work.', ['cause-effect']],
  ]),
  readingSet('p7-s24', 'text message chain', '9:12 A.M. Rosa: I’m at the exhibition hall, but our printed brochures haven’t arrived.\n9:14 A.M. Devin: The courier tracking page says they were delivered to the north entrance.\n9:15 A.M. Rosa: I checked there. The security officer has only two boxes for another exhibitor.\n9:17 A.M. Devin: I’ll call the courier. Meanwhile, the digital brochure is in our shared folder. Could the hall’s business center print twenty copies?\n9:19 A.M. Rosa: Yes, it opens at nine-thirty. I’ll go there now and use those until the shipment is found.', [
    ['What problem does Rosa report?', ['The exhibition hall is closed', 'Some brochures are missing', 'A shared folder is unavailable', 'A security officer needs assistance'], 'B', 'The printed brochures have not arrived where expected.', ['detail']],
    ['What will Rosa probably do next?', ['Telephone the courier', 'Open the north entrance', 'Visit the business center', 'Meet another exhibitor'], 'C', 'She says she will go to the business center.', ['inference']],
  ]),
  readingSet('p7-s25', 'memo', 'MEMORANDUM\nTo: Branch Managers\nFrom: Victor Alvarez, Customer Experience Director\nDate: October 2\nSubject: Updated service survey\n\nBeginning October 9, customers who complete a purchase in one of our stores will receive a receipt containing a short Web address for our revised survey. The survey now has five questions instead of twelve and should take less than two minutes. Please review the attached guide with cashiers during their next team meeting. Cashiers may mention the survey but must not offer discounts or gifts for completing it. Each branch will receive a monthly summary showing its response rate and average satisfaction score. Questions about accessing these reports should be sent to Data Services, not to the Help Desk.', [
    ['What change was made to the survey?', ['It is shorter', 'It is available only in stores', 'It offers a discount', 'It is mailed to customers'], 'A', 'The revised survey has five questions instead of twelve.', ['detail']],
    ['Who should be contacted about viewing monthly reports?', ['The Help Desk', 'Branch cashiers', 'Data Services', 'The Customer Experience Director'], 'C', 'The memo directs report-access questions to Data Services.', ['detail']],
  ]),
];
