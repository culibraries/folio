# Architecture diagrams

## Amazon Web Services

```{mermaid}
flowchart LR
  subgraph az[Availability Zone]
    direction TB
    subgraph VPC
      direction TB
      subgraph files[File Storage]
        s3[/s3\]
      end
      subgraph eks[Kubernetes via EKS]
        direction TB
        subgraph ng1[Nodegroup]
          direction TB
          n1(Node 1)
          n2(Node 2)
        end
        subgraph ng2[Nodegroup]
          direction TB
          n3(Node 3)
          n4(Node 4)
        end
      end
      subgraph rds
        psql[(Database)]
      end
      subgraph es[ElasticSearch]
        openSearch[AWS OpenSearch]
      end
      eks<-->rds
      eks-->ses
      eks<-->files
      eks<-->es
    end
      subgraph ses[SES]
        %% Outside of VPC
        ses1[Email Service]
      end
      r53[Route 53]-->eks
  end
```

## FOLIO Application

```{mermaid}
flowchart TB
  subgraph Kubernetes
    subgraph FOLIO Project
      Stripes -->okapi <--> m1 & m2 & m3 & m4 & m5
      m1[mod_user]
      m2[mod_user_bl]
      m3[mod_circulation]
      m4[mod_circulation_storage]
      m5[mod_inventory]
      m6[mod_inventory_storage]
      m70[60+ additional modules]
    end
    kafka[(Kafka)]
  end
  db[(PostgreSQL)]
  s3[/s3 file storage\]
  m4 & m6 & m70<-->db
  m3 & m6 & m70<-->kafka
  m3 & m6 & m70<-->s3
```
