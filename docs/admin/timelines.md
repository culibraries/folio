# Timelines

## Contract end dates

- University Libraries Summon Contract Ends 2022-06-30
- Law Millennium Contract Ends 2023-06-30
- University Libraries Sierra Contract Ends 2023-09-30

## Overview

| |2022Q1|2022Q2|2022Q3|2022Q4|2023Q1|2023Q2|
|-|-|-|-|-|-|-|
||Replanning|EDS Deployment|Infrastructure and Data|Training and Documentation|Pre-Implementation|Implementation|
|University<br /> Libraries|Review all critical tasks that are<br /> underway or not yet started that<br /> are required for a successful go-live<br /><br />Revise project schedule accordingly|Concentrate EDS deployment effort on<br /> configuring and implementing<br /> the new discovery layer over Sierra<br /><br />Expected go-live in the month of June|Continue iterating on repeatable<br /> infrastructure deployment<br /><br />Deploy Kiwi release<br /><br />Conclude data migration activities|Begin organization-wide<br /> training program<br /><br />Develop required functional and<br /> technical documentation|Deploy Lotus release|Complete readiness<br /> checklist for go-live|
|Law|As above|Negotiate and finalize data<br /> migration contract with Index Data.|Begin data migration.|Participate in the Norlin<br /> training program.<br /><br />Develop required functional<br /> documentation specific to the<br /> needs of the Law Library|Conclude data migration<br /> activities.|As above|

## Detailed timeline

```{mermaid}
  gantt
      dateFormat  YYYY-MM-DD
      excludes  weekends
      axisFormat %Y-%m-%d

      section FOLIO Community
      2022.r1.0 (INN-Reach backend) :milestone, 2022-04-18, 0d
      2022.r2.0 :milestone, 2022-08-08, 0d
      2022.r3.0 :milestone, 2022-11-08, 0d
      INN-Reach iii certification :milestone, 2022-11-22, 0d
      INN-Reach GA :milestone, 2023-02-23, 0d

      section Project Management
      Refactor Timeline     :active, 2022-02-21, 1w
      Review Requirements   :active, 2022-02-21, 38d
      Documentation :2022-04-01, 12w
      Create Training :2022-05-01, 12w
      Deliver Training :2022-09-01, 12w

      section Data Migration
      Acquisitions Mapping :active, dm1, 2022-02-21, 4w
      Refine Instance, Holdings, and Item mapping :active, 2022-02-21, 8w
      Circulation Mapping:dm3, after dm1, 8w
      Dry Runs :2022-05-01, 8w
      Law Data Mapping      :d4, 2022-09-01  , 12w
      Comprehensive Dry Runs      :d5, after d4, 12w

      section Operations
      Scratch Environment :active, o1, 2022-03-01, 4w
      Deploy Kiwi :crit, o2, after o1,  4w
      Infrastructure improvements :o3, after o2, 4w
      Deploy LDP :crit, o4, after o3, 4w
      Deploy Lotus :o5, 2022-08-01, 4w
      Deploy Morning Glory :o6, 2022-11-01, 4w

      section Discovery
      EDS over Sierra   :active, d1, 2022-02-21, 12w
      Relevancy Testing  :12w

      section Metadata - Deep Dives
      Data Export: 2022-09-01,2022-09-30
      Bound-withs: 2022-09-01,2022-10-15
      Data Import: 2022-07-01,2022-09-01
      Bulk Edit: 
      Deleting Records: 
      Local notes/Statistical codes: 
      Authority Control: 

      section Metadata - Data Import
      Document active Sierra load profiles :active, 2022-02-28, 4w
      Annotate Sierra load profiles :2022-04-01, 8w
      Create basic profile :2022-09-01, 3w
      Create and test necessary profiles :2022-10-01, 6w
      Complete and Document Profiles :2022-12-01, 6w

      section Metadata - Single Record
      Copy Cataloging: 2022-03-15, 2w
      Original Cataloging: 2022-03-15, 2w
      Brief Bibs: 2022-04-01, 2w
      Overlaying Bibs: 2022-04-01, 2w

```

### Other data sources

- [INN-Reach Development Update 2022-02-07](https://docs.google.com/presentation/d/1-DkuEd6Mh9lDpywmnRUTp1oF5NHmQcaI/edit#slide=id.p10)
