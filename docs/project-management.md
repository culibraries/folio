# Project Management

## Timelines

### Contract end dates

- Summon Contract Ends 2022-06-30
- Millennium Contract Ends 2023-06-30
- Sierra Contract Ends 2023-09-30

```{mermaid}
  gantt
      dateFormat  YYYY-MM-DD
      excludes  weekends
      axisFormat %Y-%m-%d

      section FOLIO Community
      2022.r1.0 (INN-Reach backend) :milestone, 2022-04-18, 0d
      2022.r2.0 :milestone, 2022-08-08, 0d
      INN-Reach UI :milestone, 2022-10-01, 0d
      2022.r3.0 :milestone, 2022-11-08, 0d

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
      Deploy Kiwi :o2, after o1,  4w
      Infrastructure improvements :o3, after o2, 4w
      Deploy LDP :o4, after o3, 4w
      Deploy Lotus :o5, 2022-08-01, 4w
      Deploy Morning Glory :o6, 2022-11-01, 4w

      section Discovery
      EDS over Sierra   :active, d1, 2022-02-21, 12w
      Relevancy Testing  :12w

      section Meta
```
