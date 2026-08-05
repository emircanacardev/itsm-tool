FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY src/ITSM.Domain/ITSM.Domain.csproj src/ITSM.Domain/
COPY src/ITSM.Shared/ITSM.Shared.csproj src/ITSM.Shared/
COPY src/ITSM.Application/ITSM.Application.csproj src/ITSM.Application/
COPY src/ITSM.Infrastructure/ITSM.Infrastructure.csproj src/ITSM.Infrastructure/
COPY src/ITSM.API/ITSM.API.csproj src/ITSM.API/
RUN dotnet restore src/ITSM.API/ITSM.API.csproj

COPY src/ src/
RUN dotnet publish src/ITSM.API/ITSM.API.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .

# Render (ve çoğu PaaS) TLS'i kendi katmanında sonlandırıp container'a düz
# HTTP yönlendiriyor. PORT değişkenini platform veriyor, yoksa 8080'e düşüyoruz.
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "ITSM.API.dll"]
