# ArgoCD Installation on EKS

## Prerequisites

- `kubectl` configured to talk to your EKS cluster
- `KUBECONFIG` pointing at the target cluster

## Step-by-step installation

### 1. Install ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Wait for all pods to become ready:

```bash
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s
```

### 2. Create the food-delivery namespace

```bash
kubectl create namespace food-delivery
```

### 3. Apply the AppProject

```bash
kubectl apply -f argocd/projects/food-delivery-project.yaml
```

### 4. Apply the App-of-Apps root Application

```bash
kubectl apply -f argocd/apps/app-of-apps.yaml
```

ArgoCD will automatically discover and sync all service applications from
`argocd/apps/services/`.

## Access the ArgoCD UI

```bash
# Port-forward the ArgoCD server
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get the initial admin password
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath="{.data.password}" | base64 -d && echo
```

Open https://localhost:8080 and log in with username `admin`.

## Secrets required by GitHub Actions

Add the following secret to your GitHub repository
(**Settings → Secrets and variables → Actions**):

| Secret        | Description                                      |
|---------------|--------------------------------------------------|
| `ARGOCD_TOKEN`| ArgoCD API token with sync permissions (see below) |

### Creating an ArgoCD API token

```bash
argocd login localhost:8080 --username admin --insecure
argocd account generate-token --account admin
```

Copy the output and store it as the `ARGOCD_TOKEN` secret in GitHub.
