# Inventory

## Single Record Cataloging Procedures for a Book

Built from the [FOLIO Basic Checklist](https://docs.google.com/document/d/12i68np_upe4ysUwFarlSLt6aJX6tRHRu/edit?usp=sharing&ouid=115500830408077791861&rtpof=true&sd=true) and from [Print, basic procedures page](https://libguides.colorado.edu/c.php?g=623583&p=4350969) on RDS Wiki

**In FOLIO Inventory**, search for the Instance record that was either created or imported by Acquisitions. If you encounter a brief Instance record, keep in mind that you may have to create an original record in OCLC and then overlay that record into FOLIO Inventory.

**In OCLC Connexion**, search to find the best matching record or create an original record.

- Copy cat: Once you find the best match, and no edits are needed, add holdings in OCLC
  - Action -> Holdings -> Update holdings (F8)
- Original cat: Once you have created the original record, produce holdings in OCLC
  - Action -> Holdings -> Produce and Update holdings (Shift + F7)
- Copy the OCLC Worldcat number from the master record to overlay into Inventory

### Overlay a record from OCLC into Inventory

- Log into FOLIO and go to the Inventory App
- Under the Search & filter pane, click on the **Item** search box and select **Barcode** from the pull-down menu and type in, or scan in, the barcode number to bring up the title/- book in hand
- The Instance title will appear in the middle pane search results - click on it to view the Instance record
- The Instance record will now appear in the right-hand pane
- Click on the **“Actions”** button in the far upper right-hand corner of the Instance record and select **“Overlay”**
- A display box will appear prompting you to enter the OCLC Worldcat identifier - paste in the OCLC Worldcat number and press the **Import** button
- The OCLC record will be loaded and then a green message box will appear at the bottom of the screen indicating the record was successfully updated
- Still in the Instance record, go to **“Actions” -> View Source** to verify that the MARC record was properly loaded
  - Verify that the 035 OCLC number is present, then exit the view source page
- Still in the Instance record, go to the far upper corner **“Actions” -> “Edit”** and change the **Cataloged date** to today’s date and change the Instance status to **“Cataloged”**
- Also, while in “Edit”, click on the **Add Statistical code** button and select **“ARL (Collection stats): Books - print (books)”**
- *CAT LEVEL - TBD: Could this be added under the “Add statistical code” pull down menu?*
- Click **“Save and close”** at the bottom

Processes that need to be addressed:

- [ ] Verify call number function to check for potential conflict in the shelf list
  - This functionality is under development
- [ ] Add your cataloger’s initials in a 946 field for tracking stats
  - TBD

### Adding/Editing Holdings Record

- If Acquisitions already created a Holdings record, simply verify or edit as needed the below field. If there is no Holdings records, create one by clicking on the **“Add - holdings”** button from the Instance
- Set the Holdings type to **“Monograph”**
- Go to the Holdings location section and set the Permanent location to **“Norlin Stacks (CU/B/NOR/NOR)”**
- Go to the Holdings call number section and set Call number type to **“Library of Congress classification”**
  - Then copy and paste the LC call number into the **“Call number”** box
  - Delete the subfield “$b” delimiter
- Go to the ILL Policy section and set the ILL Policy to **“Will lend”**
- Click **“Save and close”** at the bottom

### Adding/Editing Item Record

- If Acquisitions already created an Item record, click on the **barcode number** to open and view the Item Record. If there is no Item record, create one by clicking on the **“Add item”** button from the Instance
- Scan, or type in, the Barcode number. If there’s already a barcode, simply verify its accuracy
- Go to the Item Data section and set the Material type to **“book”**
- In the **Copy number** box, type in the appropriate copy number (i.e., **1**)
- Go to the Loan and Availability section and set the Permanent Loan Type to **“Can circulate”**
- Add volume designation if needed for an multi-volume set
- When finished, click the **“Save and close”** at the bottom

## New Fast Add Record - (Brief Instance/Holdings/Item)

*These instructions should be used when a newly ordered or received item does not have a bib record in OCLC.* Other instances of needing a brief record may require slightly different steps.

In the Inventory app:

1. Search for the title to confirm there is not a record in Folio or OCLC
1. In the top right corner, click on the “Actions” button
   1. Select “New Fast Add Record”
1. Enter brief information for the Instance, Holdings, & Item
   1. Instance:
      1. Make sure *“Suppress from discovery”* is unchecked
      2. Instance status term = *temporary / not assigned / uncataloged*
      3. Resource title (from order information)
      4. Publication date (from order information)
      5. ISBN (from order information)
      6. Select resource type
         1. See [cheat sheet](common-resource-types-for-new-instances) of common resource types
      7. Contributors
         1. Click *“Add contributors”* and enter the first author/editor/etc.
            1. Include name and name type
            2. If this is the primary author, select the *“make primary”* button
   1. Holdings
      1. Selection appropriate location from drop down
      1. Other fields can be updated at receipt of item
   1. Instance
      1. Barcode
         1. Leave blank if this is created when item is ordered
         1. If item in hand is barcoded, scan barcode
      1. Material type
         1. Use the drop down to select the material type
      1. Permanent loan type
         1. Select the appropriate loan type for location (NOTE: this can be updated later if it needs to change)
      1. Item notes
         1. Click on the trash can to delete this field
      1. Electronic Access
         1. If this is for an electronic title, a URL can be added
1. Click “Save and Close”
   1. You should get a toast at the bottom of the page that states “Inventory records have been created successfully”
1. Return to the instance app and run a search for the title to conform record creation
   1. This record can be overlaid with one from OCLC
   1. You can edit the Instance/Holdings/Item records individually after they have been created
   1. Reminder: you cannot edit with QuickMarc until the record is overlaid with one that has MARC as the source

### Common Resource types for New Instances

The options you see in Inventory are from the RDA 336 content type vocabulary

- Text = book, e-book
- Two-dimensional moving image = DVD, Blu-ray, streaming video, motion picture film reel
- Notated music = score
- Cartographic image = map, atlas
- Performed music = CD, streaming audio, audio cassette, vinyl record
- Spoken word = CD, streaming audio, audio cassette, vinyl record
